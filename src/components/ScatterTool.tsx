import { useRef, useState } from "react";
import { compromiseStopTags, RESPONSES } from "./consts";
import { Status, type CompromiseTerm, type Row } from "./types";
import nlp from "compromise";
import ResultsTable from "./ResultsTable";
import type {
  EmbeddingsWorkerMessage,
  EmbeddingsWorkerResponse,
} from "./workers/embeddingsWorker";

import type { ReductionWorkerMessage } from "./workers/reductionWorker";
import ScatterGraph from "./ScatterGraph";
import useSentiment from "./useSentiment";
import WordFrequency from "./wordFrequency";
import { useStore } from "@nanostores/react";
import { $rows } from "./stores";

export default function ScatterTool() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [status, setStatus] = useState<Status>(Status.PENDING);
  const parsedText = useStore($rows);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusError, setStatusError] = useState<string>("");
  const [rootsFreq, setRootsFreq] = useState<[string, number][]>([]);
  const [stakeholders, setStakeholders] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    //Parse text from user input
    setStatus(Status.PARSING);

    const rawText = textareaRef.current?.value ?? "";

    function parseText(rawText: string): Row[] {
      const rows: Row[] = [];
      rawText
        .trim()
        .split("\n")
        .forEach((str) => {
          const [id, text, stakeholder] = str.split("\t");
          //Split responses into sentences
          const sentences: string[] = nlp(text).sentences().out("array");
          sentences.forEach((sentence, i) => {
            rows.push({
              id: Number(id),
              sentenceIndex: i,
              text: sentence.trim(),
              stakeholder: stakeholder.trim(),
            });
          });
        });
      return rows;
    }

    const nextParsedText = parseText(rawText != "" ? rawText : RESPONSES);
    setStakeholders(
      Array.from(
        new Set(nextParsedText.map((r) => r.stakeholder.trim()))
      ).sort()
    );
    $rows.set(nextParsedText);

    //Generate embeddings via worker
    setStatus(Status.EMBEDDING);
    const embeddingsWorker = new Worker(
      new URL("./workers/embeddingsWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const embeddingsMessage: EmbeddingsWorkerMessage = {
      responses: nextParsedText,
    };
    embeddingsWorker.postMessage(embeddingsMessage);

    embeddingsWorker.onmessage = async (
      e: MessageEvent<EmbeddingsWorkerResponse>
    ) => {
      const { mergedRows } = e.data;
      const nextParsedText = mergedRows;
      $rows.set(nextParsedText);
      embeddingsWorker.terminate();

      //Reduce to 2D for scattergraph
      setStatus(Status.MAPPING);
      const reductionWorker = new Worker(
        new URL("./workers/reductionWorker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      //Come back and validate that the embeddings aren't undefined...
      const reductionMessage: ReductionWorkerMessage = {
        embeddings: nextParsedText.map((row) => row.embedding!),
      };
      reductionWorker.postMessage(reductionMessage);

      reductionWorker.onmessage = (e) => {
        const { coords, error } = e.data;

        if (error) {
          console.error("UMAP Worker error:", error);
          setStatus(Status.ERROR);
          reductionWorker.terminate();
          return;
        }

        coords.forEach(
          (pt: number[], i: number) =>
            (nextParsedText[i].coords = {
              x: pt[0],
              y: pt[1],
            })
        );
        reductionWorker.terminate();

        //Compute sentence roots
        setStatus(Status.STEMMING);
        const nextRootsFreq: Record<string, number> = {};
        nextParsedText.forEach((row, i) => {
          const doc = nlp(row.text);
          doc.compute("root");
          const roots = doc
            .json()[0]
            .terms.filter((t: CompromiseTerm) => {
              return (
                //Filter out inconsequential words
                !compromiseStopTags.some((tag) => t.tags.includes(tag))
              );
            })
            .map((t: CompromiseTerm): string => t.root || t.normal);
          nextParsedText[i].roots = roots;

          for (const root of roots) {
            nextRootsFreq[root] = (nextRootsFreq[root] || 0) + 1;
          }
        });
        const nextRootsFreqSorted = Object.entries(nextRootsFreq).sort(
          (a, b) => b[1] - a[1]
        );
        setRootsFreq(nextRootsFreqSorted);
        setStatus(Status.COMPLETE);
      };
    };
  }

  const getSentiment = useSentiment({
    setStatus,
    parsedText,
  });
  return (
    <div className="m-8">
      <div className="grid grid-cols-3 gap-4 min-h-screen">
        <div>
          <h1 className="text-2xl font-bold mb-2">Open Text Qual Tool</h1>
          <form onSubmit={handleSubmit} className="flex flex-col mb-4">
            <textarea
              ref={textareaRef}
              className="h-36 border border-gray-400 rounded-md px-2 py-1 mb-2"
              placeholder="Paste open text responses here"
            />
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded w-[120px]"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={getSentiment}
                className="px-4 py-2 bg-blue-500 text-white rounded w-[160px]"
              >
                Get sentiment
              </button>
            </div>
            <p className="text-sm mt-1">
              {status}
              {status === Status.ERROR && statusError}
            </p>
          </form>

          <ResultsTable selectedIds={selectedIds} />
        </div>
        <div className="col-span-2">
          <div>
            <ScatterGraph
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              stakeholders={stakeholders}
            />
            <div className="pt-2">
              {rootsFreq?.[0] && (
                <WordFrequency
                  rootsFreq={rootsFreq}
                  setRootsFreq={setRootsFreq}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { compromiseStopTags, RESPONSES } from "../consts";
import { Status, type CompromiseTerm, type Row } from "../types";
import nlp from "compromise";
import type {
  EmbeddingsWorkerMessage,
  EmbeddingsWorkerResponse,
} from "../workers/embeddingsWorker";

import type { ReductionWorkerMessage } from "../workers/reductionWorker";
import { $rows } from "../stores";
import { $status } from "../stores";

export default function useScatter({
  textareaRef,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [rootsFreq, setRootsFreq] = useState<[string, number][]>([]);
  const [stakeholders, setStakeholders] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    //Parse text from user input
    $status.set(Status.PARSING);

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
    $status.set(Status.EMBEDDING);
    const embeddingsWorker = new Worker(
      new URL("../workers/embeddingsWorker.ts", import.meta.url),
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
      $status.set(Status.MAPPING);
      const reductionWorker = new Worker(
        new URL("../workers/reductionWorker.ts", import.meta.url),
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
          $status.set(Status.ERROR);
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
        $status.set(Status.STEMMING);
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
        $status.set(Status.COMPLETE);
      };
    };
  }
  return handleSubmit;
}

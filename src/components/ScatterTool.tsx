import { useRef, useState } from "react";
import { RESPONSES } from "./consts";
import { Status, type Row } from "./types";
import nlp from "compromise";
import ResultsTable from "./ResultsTable";
import type { EmbeddingsWorkerResponse } from "./embeddingsWorker";
import { cos_sim, pipeline, type Tensor } from "@xenova/transformers";

export default function ScatterTool() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [status, setStatus] = useState<Status>(Status.PENDING);
  const [parsedText, setParsedText] = useState<Row[]>([]);

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
              text: sentence,
              stakeholder,
            });
          });
        });
      return rows;
    }

    const nextParsedText = parseText(rawText != "" ? rawText : RESPONSES);
    setParsedText(nextParsedText);

    //Generate embeddings via worker
    setStatus(Status.EMBEDDING);
    const embeddingsWorker = new Worker(
      new URL("./embeddingsWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    embeddingsWorker.postMessage({ responses: nextParsedText });

    embeddingsWorker.onmessage = async (
      e: MessageEvent<EmbeddingsWorkerResponse>
    ) => {
      const { embeddings } = e.data;
      nextParsedText.forEach(
        (response, i) => (response.embedding = embeddings[i])
      );
      setParsedText(nextParsedText);
      embeddingsWorker.terminate();

      //Remerge sentences with similar embeddings
      setStatus(Status.MERGING);
      const extractor = await pipeline(
        "feature-extraction",
        "/Xenova/all-MiniLM-L6-v2"
      );
      for (let i = nextParsedText.length - 1; i > 0; i--) {
        const thisRow = nextParsedText[i];
        for (let x = i - 1; x >= 0; x--) {
          const targetRow = nextParsedText[x];
          if (targetRow.id !== thisRow.id) break;
          const sim = cos_sim(thisRow.embedding!, targetRow.embedding!); //Should come back and validate that the embeddings are there properly...
          if (sim > 0.4) {
            targetRow.text += " " + thisRow.text;
            const embeddingTensor = await extractor(targetRow.text, {
              //Could pull this out of the loop later to make things faster
              pooling: "mean",
              normalize: true,
            });
            const embedding = embeddingTensor.tolist() as number[];
            console.log(embedding);
            targetRow.embedding = embedding;
            nextParsedText.splice(i, 1);
            console.log("sentence remerged");
            break;
          }
        }
      }
      setParsedText([...nextParsedText]);
    };
  }

  return (
    <div className="m-8">
      <h1 className="text-2xl font-bold mb-2">Open Text Qual Tool</h1>

      <form onSubmit={handleSubmit} className="flex flex-col mb-4">
        <textarea
          ref={textareaRef}
          className="h-48 w-[600px] border border-gray-400 rounded-md px-2 py-1 mb-2"
          placeholder="Paste open text responses here"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded w-[120px]"
        >
          Submit
        </button>
        <p className="text-sm mt-1">{status}</p>
      </form>
      <ResultsTable parsedText={parsedText} />
    </div>
  );
}

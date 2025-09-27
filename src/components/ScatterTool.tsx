import { useRef, useState } from "react";
import { RESPONSES } from "./consts";
import type { Row } from "./types";
import ResultsTable from "./ResultsTable";

export default function ScatterTool() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [parsedText, setParsedText] = useState<Row[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const rawText = RESPONSES; //textareaRef.current?.value ?? "";

    function parseText(rawText: string): Row[] {
      const rows = rawText
        .trim()
        .split("\n")
        .map((str) => {
          {
            const vals = str.split("\t");
            return {
              id: Number(vals[0]),
              text: vals[1],
              stakeholder: vals[2],
            };
          }
        });
      return rows;
    }

    setParsedText(parseText(rawText));
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
      </form>
      <ResultsTable parsedText={parsedText} />
    </div>
  );
}

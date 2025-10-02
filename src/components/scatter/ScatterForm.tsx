import { useStore } from "@nanostores/react";
import { $rows } from "./stores";
import useSentiment from "./hooks/useSentiment";
import { useRef } from "react";
import useScatter from "./hooks/useScatter";

export default function ScatterForm() {
  const parsedText = useStore($rows);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getSentiment = useSentiment({
    parsedText,
  });

  const handleSubmit = useScatter({ textareaRef: textareaRef });

  return (
    <>
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
      </form>
    </>
  );
}

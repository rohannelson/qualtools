import { useRef } from "react";
import useScatter from "./hooks/useScatter";

export default function ScatterForm() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = useScatter({ textareaRef: textareaRef });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Open Text Qual Tool</h1>
      <form onSubmit={handleSubmit} className="flex flex-col mb-4">
        <div className="flex gap-4">
          <textarea
            ref={textareaRef}
            className="h-36 border border-gray-400 rounded-md px-2 py-1 mb-2 max-w-[600px]"
            placeholder="Paste open text responses here"
          />
          <div className="flex flex-col">
            <h2 className="text-xl font-medium mb-2">Advanced options</h2>
            <label htmlFor="filter-nos">
              <input
                id="filter-nos"
                type="checkbox"
                className="mr-2"
                defaultChecked={true}
              ></input>
              Filter 'no's
            </label>
            <label htmlFor="stopwords" className="mt-2">
              Stop words
            </label>
            <input
              className="mb-2 border border-gray-400 px-1 py-0.5 rounded"
              id="stopwords"
              type="text"
              placeholder="stop words"
            ></input>
            <label htmlFor="sim-threshold">Remerging threshold</label>
            <input
              id="sim-threshold"
              type="number"
              defaultValue={8.1}
              className="border border-gray-400 px-1 py-0.5 rounded"
            ></input>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded w-[120px]"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

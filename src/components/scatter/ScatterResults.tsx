import { useRef, useState } from "react";
import ResultsTable from "./ScatterTable";
import ScatterGraph from "./ScatterGraph";
import WordFrequency from "./wordFrequency";
import { useStore } from "@nanostores/react";
import { $rootsFreq, $stakeholders, $status } from "./stores";
import { Status } from "./types";
import useSentiment from "./hooks/useSentiment";

export default function ScatterResults() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusError, setStatusError] = useState<string>("");
  const rootsFreq = useStore($rootsFreq);
  const stakeholders = useStore($stakeholders);
  const status = useStore($status);

  const getSentiment = useSentiment();

  return (
    <div className="m-8">
      <div className="grid grid-cols-3 gap-4 min-h-screen">
        <div>
          <div className="flex mb-2 justify-between w-full">
            <h1 className="text-4xl font-bold">Scatterplot Tool</h1>{" "}
            <button
              type="button"
              onClick={getSentiment}
              className="px-2 py-1 bg-blue-500 text-white rounded w-[160px]"
            >
              Get sentiment
            </button>
            <p className="text-sm">
              {status}
              {status === Status.ERROR && statusError}
            </p>
          </div>
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
              {rootsFreq?.[0] && <WordFrequency rootsFreq={rootsFreq} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

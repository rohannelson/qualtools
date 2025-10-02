import { useRef, useState } from "react";
import ResultsTable from "./ScatterTable";
import ScatterGraph from "./ScatterGraph";
import WordFrequency from "./wordFrequency";
import { useStore } from "@nanostores/react";
import { $status } from "./stores";
import { Status } from "./types";

export default function ScatterResults() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rootsFreq, setRootsFreq] = useState<[string, number][]>([]);
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string>("");

  const status = useStore($status);

  return (
    <div className="m-8">
      <div className="grid grid-cols-3 gap-4 min-h-screen">
        <div>
          <div className="flex mb-2">
            <h1 className="text-2xl font-bold">Scatterplot Tool</h1>{" "}
            <p className="text-sm ml-auto">
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

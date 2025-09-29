import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { WordsFreq } from "./types";

export default function WordFrequency({
  rootsFreq,
  setRootsFreq,
}: {
  rootsFreq: WordsFreq;
  setRootsFreq: Dispatch<SetStateAction<WordsFreq>>;
}) {
  function sortByFrequency() {
    setRootsFreq([...rootsFreq].sort((a, b) => b[1] - a[1]));
  }
  const [alphabetical, setAlphabetical] = useState(false);
  return (
    <div className="ml-10">
      <h2 className="text-xl font-bold mb-2">Frequency List</h2>
      <button
        type="button"
        onClick={() => {
          !alphabetical
            ? setRootsFreq([...rootsFreq].sort())
            : sortByFrequency();
          setAlphabetical(!alphabetical);
        }}
        className="border rounded-md p-1 mb-1"
      >
        {alphabetical ? "Sort by frequency" : "Sort alphabetically"}
      </button>
      <div>
        <dl>
          {rootsFreq.map(
            (root) =>
              root[1] >= 5 && (
                <div className="flex gap-2" key={root[0]}>
                  <dt className="font-bold">{root[0]}</dt>
                  <dd>{root[1]}</dd>
                </div>
              )
          )}
        </dl>
      </div>
    </div>
  );
}

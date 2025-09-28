import type { WordsFreq } from "./types";

export default function WordFrequency({ freqList }: { freqList: WordsFreq }) {
  return (
    <div className="ml-10">
      <h2 className="text-xl font-bold mb-2">Frequency List</h2>
      <dl>
        {freqList.map((freqItem) =>
          freqItem[1] < 5 ? (
            <></>
          ) : (
            <div className="flex gap-2" key={freqItem[0]}>
              <dt className="font-bold">{freqItem[0]}</dt>
              <dd>{freqItem[1]}</dd>
            </div>
          )
        )}
      </dl>
    </div>
  );
}

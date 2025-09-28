import type { Row } from "./types";

export default function ResultsTable({
  parsedText,
  selectedIds,
}: {
  parsedText: Row[];
  selectedIds: Set<string>;
}) {
  return (
    <>
      {parsedText.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex w-full">
              <h2 className="font-semibold">Extracted Text (Selected)</h2>
              <p className="ml-auto">{parsedText.length} rows</p>
            </div>
          </div>
          <table className="border-collapse border border-black w-full">
            <thead>
              <tr>
                <th className="border border-black p-1 text-left">ID</th>
                <th className="border border-black p-1 text-left">#</th>
                <th className="border border-black p-1 text-left">Text</th>
                <th className="border border-black p-1 text-left">
                  Stakeholder
                </th>
                <th className="border border-black p-1 text-left">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {(selectedIds.size === 0
                ? parsedText
                : parsedText.filter((row) =>
                    selectedIds.has(`${row.id}-${row.sentenceIndex}`)
                  )
              ).map((row) => (
                <tr key={`${row.id}-${row.sentenceIndex}`}>
                  <td className="border border-black p-1">{row.id}</td>
                  <td className="border border-black p-1">
                    {Number(row.sentenceIndex) + 1}
                  </td>
                  <td className="border border-black p-1">{row.text}</td>
                  <td className="border border-black p-1">{row.stakeholder}</td>
                  <td className="border border-black p-1">
                    {row.sentiment?.label.toLowerCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

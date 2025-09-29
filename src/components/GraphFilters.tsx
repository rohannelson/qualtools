export default function GraphFilters({
  stakeholders,
}: {
  stakeholders: string[];
}) {
  return (
    <div className="ml-auto flex gap-2 items-center">
      {/* Search */}
      <input
        type="text"
        placeholder="Search"
        className="border rounded px-2 py-1"
      />

      {/* Stakeholder filter */}
      <label htmlFor="stakeholder" className="text-sm font-medium">
        Stakeholder
      </label>
      <select
        name="stakeholder"
        id="stakeholder"
        className="border rounded px-2 py-1"
      >
        <option value="">All</option>
        {stakeholders.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Sentiment filter */}
      <label htmlFor="sentiment" className="text-sm font-medium">
        Sentiment
      </label>
      <select
        name="sentiment"
        id="sentiment"
        className="border rounded px-2 py-1"
      >
        <option value="">All</option>
        <option value="positive">Positive</option>
        <option value="negative">Negative</option>
      </select>
    </div>
  );
}

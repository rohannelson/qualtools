import { useStore } from "@nanostores/react";
import { $filters } from "./stores";
import type { Sentiment } from "./types";
import type { Dispatch, SetStateAction } from "react";

export default function GraphFilters({
  stakeholders,
  setSelectedIds,
}: {
  stakeholders: string[];
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const filters = useStore($filters);

  function isSentiment(val: string): val is Sentiment {
    return val === "all" || val === "positive" || val === "negative";
  }

  return (
    <div className="ml-auto flex gap-2 items-center">
      <button
        type="button"
        onClick={() => setSelectedIds(new Set())}
        className="px-2 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
      >
        Deselect All
      </button>

      {/* Search */}
      <input
        type="text"
        placeholder="Search"
        className="border rounded px-2 py-1"
        value={filters.search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          $filters.set({ ...filters, search: e.currentTarget.value })
        }
      />

      {/* Stakeholder filter */}
      <label htmlFor="stakeholder" className="text-sm font-medium">
        Stakeholder
      </label>
      <select
        name="stakeholder"
        id="stakeholder"
        className="border rounded px-2 py-1"
        value={filters.stakeholder[0]}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          $filters.set({ ...filters, stakeholder: [e.currentTarget.value] })
        }
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
        value={filters.sentiment}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          if (isSentiment(e.currentTarget.value))
            $filters.set({ ...filters, sentiment: e.currentTarget.value });
        }}
      >
        <option value="all">All</option>
        <option value="positive">Positive</option>
        <option value="negative">Negative</option>
      </select>
    </div>
  );
}

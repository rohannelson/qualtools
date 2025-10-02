import { atom, computed } from "nanostores";
import { Status, type Row, type RowFilters } from "./types";

export const $rows = atom<Row[]>([]);

export const $status = atom<Status>(Status.PENDING);

export const $filters = atom<RowFilters>({
  stakeholder: [],
  sentiment: "all",
  search: "",
});

export const $filteredRows = computed([$rows, $filters], (rows, filters) => {
  return rows.filter((row) => {
    if (
      filters.stakeholder[0] &&
      !filters.stakeholder.includes(row.stakeholder)
    )
      return false;
    if (
      filters.sentiment !== "all" &&
      row?.sentiment?.label?.toLowerCase() !== filters.sentiment
    )
      return false;
    if (
      filters.search !== "" &&
      !row.text.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });
});

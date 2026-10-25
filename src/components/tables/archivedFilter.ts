import type { FilterGroup } from "./FilterDropdown";

/** The URL key of the "Show" filter and its only value (`?show=archived`), for `useListParams` (D80). */
export const ARCHIVED_FILTER = { show: ["archived"] } as const;

/**
 * The "Show" filter of a list that can be archived (D80): the normal list, or only the archived rows. It sits in the
 * list's Filter panel, so it appears in the applied-filters bar and is cleared with the rest. The caller turns
 * `value === "archived"` into the API's `archived: true`.
 */
export function archivedFilterGroup(value: string | undefined): FilterGroup {
  return {
    key: "show",
    label: "Show",
    options: [
      { label: "Not archived", value: undefined },
      { label: "Archived only", value: "archived" },
    ],
    value,
  };
}

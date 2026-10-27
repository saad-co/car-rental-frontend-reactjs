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

/** The URL key of the Applications list's "Show" filter: archived, or people who became drivers (D84). */
export const APPLICATIONS_SHOW_FILTER = {
  show: ["archived", "driver"],
} as const;

/**
 * The Applications list's "Show" filter (D84): the default list leaves out applications whose person is already an
 * active or inactive driver (they are on Drivers), so a third option lists exactly those.
 */
export function applicationsShowFilterGroup(
  value: string | undefined,
): FilterGroup {
  return {
    key: "show",
    label: "Show",
    options: [
      { label: "Not archived", value: undefined },
      { label: "Became drivers", value: "driver" },
      { label: "Archived only", value: "archived" },
    ],
    value,
  };
}

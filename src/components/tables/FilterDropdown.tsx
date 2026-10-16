import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";

// Look copied from TailAdmin's table filter (components/ecommerce/ProductListTable.tsx `FilterDropdown`). Changes:
// dark-mode classes removed (D20); built from a list of filter groups instead of fixed text fields; uses our shared
// Dropdown for closing on an outside click; shows how many filters are active (B75).

/** One choice of a filter group. `value` undefined means "any". */
export interface FilterOption {
  label: string;
  value: string | undefined;
}

/** One filter, e.g. Status: All / Pending / Approved... */
export interface FilterGroup {
  /** Key of the value in `onApply`'s result, usually the URL parameter, e.g. `status`. */
  key: string;
  label: string;
  options: FilterOption[];
  /** The value in effect now. */
  value: string | undefined;
}

interface FilterDropdownProps {
  groups: FilterGroup[];
  /** Called with every group's chosen value when the admin presses Apply (or Clear). */
  onApply: (values: Record<string, string | undefined>) => void;
}

const valuesOf = (groups: FilterGroup[]) =>
  Object.fromEntries(groups.map((g) => [g.key, g.value]));

/**
 * "Filter" button that opens a panel with one select per filter group, applied together with Apply. Nothing
 * changes until Apply, so picking two filters does not load the list twice.
 */
export default function FilterDropdown({
  groups,
  onApply,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  /** The choices in the open panel, not applied yet. */
  const [draft, setDraft] = useState<Record<string, string | undefined>>({});
  const activeCount = groups.filter((g) => g.value !== undefined).length;

  const open = () => {
    setDraft(valuesOf(groups));
    setIsOpen(true);
  };
  const apply = (values: Record<string, string | undefined>) => {
    setIsOpen(false);
    onApply(values);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-expanded={isOpen}
        className="dropdown-toggle flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 sm:w-auto sm:min-w-[100px]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14.6537 5.90414C14.6537 4.48433 13.5027 3.33331 12.0829 3.33331C10.6631 3.33331 9.51206 4.48433 9.51204 5.90415M14.6537 5.90414C14.6537 7.32398 13.5027 8.47498 12.0829 8.47498C10.663 8.47498 9.51204 7.32398 9.51204 5.90415M14.6537 5.90414L17.7087 5.90411M9.51204 5.90415L2.29199 5.90411M5.34694 14.0958C5.34694 12.676 6.49794 11.525 7.91777 11.525C9.33761 11.525 10.4886 12.676 10.4886 14.0958M5.34694 14.0958C5.34694 15.5156 6.49794 16.6666 7.91778 16.6666C9.33761 16.6666 10.4886 15.5156 10.4886 14.0958M5.34694 14.0958L2.29199 14.0958M10.4886 14.0958L17.7087 14.0958"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Filter
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-theme-xs font-medium text-white">
            {activeCount}
          </span>
        )}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="w-64 p-4"
      >
        {groups.map((group) => (
          <div key={group.key} className="mb-5">
            <label
              htmlFor={`filter-${group.key}`}
              className="mb-2 block text-xs font-medium text-gray-700"
            >
              {group.label}
            </label>
            <select
              id={`filter-${group.key}`}
              // A select holds strings: "" stands for "any" (undefined).
              value={draft[group.key] ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [group.key]: event.target.value || undefined,
                }))
              }
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden"
            >
              {group.options.map((option) => (
                <option key={option.label} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              apply(Object.fromEntries(groups.map((g) => [g.key, undefined])))
            }
            className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => apply(draft)}
            className="h-10 flex-1 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
          >
            Apply
          </button>
        </div>
      </Dropdown>
    </div>
  );
}

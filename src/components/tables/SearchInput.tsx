import { useEffect, useRef, useState } from "react";

// Look copied from TailAdmin's list search box (components/ecommerce/ProductListTable.tsx). Changes: dark-mode classes
// removed (D20); controlled, and tells the parent only after typing pauses (B75).

/** How long typing must pause before the search runs, so a request is not sent for every key. */
const SEARCH_DELAY_MS = 300;

interface SearchInputProps {
  /** The search in effect (from the URL). The box shows it, and follows it if it changes from outside. */
  value: string;
  /** Called with the trimmed text once typing pauses, only when it differs from `value`. */
  onSearch: (text: string) => void;
  placeholder?: string;
}

/** Search box with a magnifier icon, as in TailAdmin's tables. */
export default function SearchInput({
  value,
  onSearch,
  placeholder = "Search...",
}: SearchInputProps) {
  /** What is typed right now; `value` catches up after the pause. */
  const [text, setText] = useState(value);
  /** The `value` of the previous render, to notice when it changes. */
  const [previousValue, setPreviousValue] = useState(value);
  /** `onSearch` of the latest render, so the timer below never calls a stale one. */
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // The search changed from outside (back button, a link): show it. Not when it is only our own search coming back,
  // or a space typed at the end would be removed while the admin is still typing. Done during render, React's
  // pattern for "adjust state when a prop changes", which avoids the extra render an effect would cause.
  if (value !== previousValue) {
    setPreviousValue(value);
    if (text.trim() !== value) setText(value);
  }

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === value) return;
    const timer = setTimeout(
      () => onSearchRef.current(trimmed),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [text, value]);

  return (
    <div className="relative w-full sm:w-auto">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-500">
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z"
          />
        </svg>
      </span>
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-4 pl-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden sm:w-[300px]"
      />
    </div>
  );
}

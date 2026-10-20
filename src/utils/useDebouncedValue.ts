import { useEffect, useState } from "react";

/**
 * The value as it was `delayMs` after it last changed: while someone is still typing, it keeps the old value, so a
 * request that depends on it is sent once they pause. Pass something that compares by value (a string or number): an
 * object made fresh on every render would look changed every time.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

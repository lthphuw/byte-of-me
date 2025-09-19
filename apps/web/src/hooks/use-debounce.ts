import { useEffect, useState } from 'react';





/**
 * Delay updating a value until after a timeout.
 * @param value The input value (string, number, etc.)
 * @param delay Time in ms
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(id);
  }, [value, delay]);

  return debouncedValue;
}

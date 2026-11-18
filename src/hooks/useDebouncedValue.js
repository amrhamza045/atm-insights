import { useEffect, useState } from "react";

/** The value once it has stopped changing for `delay` ms (for search boxes). */
export default function useDebouncedValue(value, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
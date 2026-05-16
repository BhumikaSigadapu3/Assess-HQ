import { useMemo, useRef } from "react";

export function useDebouncedCallback(fn, delayMs) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef(null);

  return useMemo(() => {
    const debounced = (...args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fnRef.current(...args);
      }, delayMs);
    };
    debounced.cancel = () => {
      if (timer.current) clearTimeout(timer.current);
    };
    return debounced;
  }, [delayMs]);
}

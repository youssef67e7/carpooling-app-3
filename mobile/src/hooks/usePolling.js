import { useEffect, useRef } from "react";

/**
 * Runs `fn` immediately then every `intervalMs` while `active` and `isFocused`.
 * Cleans up interval on blur/unmount or when deps change.
 */
export function usePolling(fn, intervalMs, active, isFocused = true) {
  const ref = useRef(fn);
  ref.current = fn;

  useEffect(() => {
    if (!active || !isFocused) return undefined;
    const run = () => {
      try {
        ref.current();
      } catch {
        /* swallow: callers use thunks */
      }
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [active, isFocused, intervalMs]);
}

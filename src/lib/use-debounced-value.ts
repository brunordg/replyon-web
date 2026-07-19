import { useEffect, useState } from "react";

/**
 * The value, settled — it only updates once `value` has stopped changing for
 * `delay` ms.
 *
 * Every search box in the app feeds a server query, so without this each
 * keystroke is a request. 350 ms is the delay /clientes has always used; keeping
 * it identical everywhere means the app types at one speed.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

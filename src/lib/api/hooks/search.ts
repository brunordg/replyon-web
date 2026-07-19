import { useQuery } from "@tanstack/react-query";
import { searchApi } from "../search";

const KEY = "search";

/** Minimum term length; matches the API's own guard. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Global search results for `q`.
 *
 * `enabled` lets the caller stop querying while the palette is closed, and
 * `placeholderData` keeps the previous hits on screen between keystrokes so the
 * list does not blink empty on every refetch.
 */
export function useGlobalSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, q],
    queryFn: ({ signal }) => searchApi.global(q, 5, signal),
    enabled: enabled && q.length >= MIN_SEARCH_LENGTH,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

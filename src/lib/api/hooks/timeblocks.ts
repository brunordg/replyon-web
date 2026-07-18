import { useQueries } from "@tanstack/react-query";
import { timeBlocksApi } from "../timeblocks";
import type { TimeBlockResponse } from "../types";

const KEY = "timeblocks";

/** Aggregates time blocks across every staff member (no tenant-wide endpoint). */
export function useAllTimeBlocks(staffIds: number[], size = 100) {
  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [KEY, "staff", id, { size }],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        timeBlocksApi.list(id, { size }, signal),
      enabled: staffIds.length > 0,
    })),
  });

  const blocks: TimeBlockResponse[] = results.flatMap((r) => r.data?.timeBlocks ?? []);

  return {
    blocks,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    error: results.find((r) => r.isError)?.error,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

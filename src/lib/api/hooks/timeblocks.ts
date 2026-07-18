import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { timeBlocksApi } from "../timeblocks";
import type { CreateTimeBlockRequest, TimeBlockResponse, UpdateTimeBlockRequest } from "../types";

const KEY = "timeblocks";

/** The block itself, without the professional it belongs to. */
export type TimeBlockDraft = Omit<CreateTimeBlockRequest, "staffId">;

/** Inclusive "YYYY-MM-DD" bounds; the backend applies them. */
export interface TimeBlockRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Aggregates time blocks across every staff member (no tenant-wide endpoint).
 *
 * The range is passed through to the API rather than filtered here — the server
 * is what knows that a recurring block anchored before the window still occurs
 * inside it, and filtering client-side would drop exactly those.
 */
export function useAllTimeBlocks(staffIds: number[], range: TimeBlockRange = {}, size = 100) {
  const { startDate, endDate } = range;

  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [KEY, "staff", id, { size, startDate, endDate }],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        timeBlocksApi.list(id, { size, startDate, endDate }, signal),
      enabled: staffIds.length > 0,
    })),
  });

  const blocks: TimeBlockResponse[] = results.flatMap((r) => r.data?.timeBlocks ?? []);

  // Same rule as the availability fan-out: one unreachable professional must not
  // hide everyone else's blocks. Loading means nothing arrived; error means
  // everything failed.
  const hasAny = results.some((r) => r.data);
  return {
    blocks,
    isLoading: !hasAny && results.some((r) => r.isLoading),
    isError: results.length > 0 && results.every((r) => r.isError),
    error: results.find((r) => r.isError)?.error,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

/**
 * Creates the same block for one or more professionals.
 *
 * "Todos" is a frontend convenience, not a backend concept — `TimeBlock` always
 * belongs to exactly one staff member. So the dialog fans out one create per
 * professional and the listing regroups the siblings back into a single card.
 *
 * `allSettled` on purpose: with ten professionals, one failure should not
 * discard the nine blocks that were created.
 */
export function useCreateTimeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffIds, block }: { staffIds: number[]; block: TimeBlockDraft }) => {
      const settled = await Promise.allSettled(
        staffIds.map((staffId) => timeBlocksApi.create(staffId, { ...block, staffId })),
      );
      const failed = settled.filter((r) => r.status === "rejected").length;
      if (failed === staffIds.length) {
        throw (settled[0] as PromiseRejectedResult).reason;
      }
      return { created: staffIds.length - failed, failed };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Applies one edit to every sibling of a grouped block. */
export function useUpdateTimeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targets,
      patch,
    }: {
      targets: { staffId: number; id: number }[];
      patch: UpdateTimeBlockRequest;
    }) => {
      await Promise.all(targets.map((t) => timeBlocksApi.update(t.staffId, t.id, patch)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Removes every sibling of a grouped block. */
export function useDeleteTimeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targets: { staffId: number; id: number }[]) => {
      await Promise.all(targets.map((t) => timeBlocksApi.remove(t.staffId, t.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

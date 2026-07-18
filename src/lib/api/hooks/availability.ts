import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { availabilityApi } from "../availability";
import type { AvailableSlotsResponse } from "../types";
import { normalizeTime } from "@/lib/appointment-slots";

const KEY = "availability";

export function useAvailableSlots(
  staffId: number | undefined,
  params: { date: string; serviceId: number | undefined },
) {
  return useQuery({
    queryKey: [KEY, "slots", staffId, params.date, params.serviceId],
    queryFn: ({ signal }) =>
      availabilityApi.slots(
        staffId as number,
        { date: params.date, serviceId: params.serviceId as number },
        signal,
      ),
    enabled: staffId != null && params.serviceId != null && !!params.date,
  });
}

/**
 * Available start times for a service on a date, per staff member.
 *
 * The slots endpoint answers for one staff at a time, so booking "by time
 * first" — pick 09:00, then see who is free — needs a fan-out over every staff
 * eligible for the service. `allSlots` is the union (any time at least one
 * professional can take), and `staffAvailableAt` answers the reverse question.
 *
 * Times are normalized to "HH:mm" here so callers can compare them directly.
 */
export function useSlotsByStaff(
  staffIds: number[],
  params: { date: string; serviceId: number | undefined },
  enabled = true,
) {
  const active = enabled && params.serviceId != null && !!params.date;

  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [KEY, "slots", id, params.date, params.serviceId],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        availabilityApi.slots(
          id,
          { date: params.date, serviceId: params.serviceId as number },
          signal,
        ),
      enabled: active,
      // A staff member with no schedule is a deterministic answer, not a blip —
      // the default 3 retries with backoff just stretch it into fake loading.
      retry: 1,
    })),
  });

  // A fan-out must not be held hostage by its slowest or most broken member:
  // one staff without a schedule cannot be allowed to hide everyone else's
  // slots. So "loading" means *nothing* has arrived yet, and "error" means
  // *everything* failed. A partial failure degrades to that staff simply not
  // being offered.
  const hasAny = results.some((r) => r.data);
  const isLoading = active && !hasAny && results.some((r) => r.isLoading);
  const isError = active && results.length > 0 && results.every((r) => r.isError);
  /** Staff whose availability could not be read — silently absent from the lists. */
  const unavailableCount = results.filter((r) => r.isError).length;
  const serviceDurationMinutes = results.find((r) => r.data)?.data?.serviceDurationMinutes;

  // Memoized on contents — `useQueries` returns a fresh array every render.
  const signature = JSON.stringify(
    staffIds.map((id, i) => [
      id,
      (results[i]?.data as AvailableSlotsResponse | undefined)?.availableSlots ?? null,
    ]),
  );

  const { slotsByStaff, allSlots } = useMemo(() => {
    const map = new Map<number, string[]>();
    const union = new Set<string>();
    for (const [id, raw] of JSON.parse(signature) as [number, string[] | null][]) {
      if (!raw) continue;
      const times = raw.map(normalizeTime);
      map.set(id, times);
      times.forEach((t) => union.add(t));
    }
    return { slotsByStaff: map, allSlots: [...union].sort() };
  }, [signature]);

  /** Ids of the staff that can start the service at `time`. */
  const staffAvailableAt = useMemo(
    () => (time: string) =>
      [...slotsByStaff.entries()].filter(([, times]) => times.includes(time)).map(([id]) => id),
    [slotsByStaff],
  );

  return {
    slotsByStaff,
    allSlots,
    staffAvailableAt,
    isLoading,
    isError,
    unavailableCount,
    serviceDurationMinutes,
  };
}

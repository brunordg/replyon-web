import { useQuery } from "@tanstack/react-query";
import { availabilityApi } from "../availability";

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

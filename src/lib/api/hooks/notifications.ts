import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../notifications";

const KEY = "notifications";

/**
 * Polls for recent WhatsApp-automated notifications. Errors are left in
 * query state (not thrown) — the bell should degrade to "nothing new"
 * rather than break the dashboard if the endpoint is unavailable.
 */
export function useNotifications() {
  return useQuery({
    queryKey: [KEY, "recent"],
    queryFn: ({ signal }) => notificationsApi.list(signal),
    refetchInterval: 60_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../dashboard";

const KEY = "dashboard";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: [KEY, "metrics"],
    queryFn: ({ signal }) => dashboardApi.metrics(signal),
  });
}

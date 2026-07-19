import { apiClient } from "./client";
import type { DashboardMetricsResponse } from "./types";

const base = "/v1/dashboard";

export const dashboardApi = {
  /** Server-computed KPIs with their previous-period comparisons. */
  metrics: (signal?: AbortSignal) =>
    apiClient.get<DashboardMetricsResponse>(`${base}/metrics`, undefined, signal),
};

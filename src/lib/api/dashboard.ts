import { apiClient } from "./client";
import type { DashboardMetricsResponse } from "./types";

const base = "/v1/dashboard";

export const dashboardApi = {
  /** KPIs calculados pelo servidor com suas comparações de período anterior. */
  metrics: (signal?: AbortSignal) =>
    apiClient.get<DashboardMetricsResponse>(`${base}/metrics`, undefined, signal),
};

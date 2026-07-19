import { apiClient } from "./client";
import type { GlobalSearchResponse } from "./types";

const base = "/v1/search";

export const searchApi = {
  /** Customers, staff and services matching `q`, capped per type by the API. */
  global: (q: string, limit?: number, signal?: AbortSignal) =>
    apiClient.get<GlobalSearchResponse>(base, { q, limit }, signal),
};

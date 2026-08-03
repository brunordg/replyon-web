import { apiClient } from "./client";
import type { GlobalSearchResponse } from "./types";

const base = "/v1/search";

export const searchApi = {
  /** Clientes, profissionais e serviços que combinam com `q`, limitados por tipo pela API. */
  global: (q: string, limit?: number, signal?: AbortSignal) =>
    apiClient.get<GlobalSearchResponse>(base, { q, limit }, signal),
};

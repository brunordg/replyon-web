import { apiClient } from "./client";
import type { TimeBlockPage, TimeBlockResponse } from "./types";

const base = (staffId: number) => `/v1/staff/${staffId}/blocks`;

export const timeBlocksApi = {
  list: (staffId: number, params?: { page?: number; size?: number }, signal?: AbortSignal) =>
    apiClient.get<TimeBlockPage>(base(staffId), params as Record<string, number | undefined>, signal),
  get: (staffId: number, blockId: number) =>
    apiClient.get<TimeBlockResponse>(`${base(staffId)}/${blockId}`),
  cancel: (staffId: number, blockId: number) =>
    apiClient.post<TimeBlockResponse>(`${base(staffId)}/${blockId}/cancel`),
  remove: (staffId: number, blockId: number) =>
    apiClient.delete<void>(`${base(staffId)}/${blockId}`),
};

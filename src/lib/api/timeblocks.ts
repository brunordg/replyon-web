import { apiClient } from "./client";
import type {
  CreateTimeBlockRequest,
  TimeBlockPage,
  TimeBlockResponse,
  UpdateTimeBlockRequest,
} from "./types";

const base = (staffId: number) => `/v1/staff/${staffId}/blocks`;

export const timeBlocksApi = {
  /** `startDate`/`endDate` are inclusive "YYYY-MM-DD"; both are optional. */
  list: (
    staffId: number,
    params?: { page?: number; size?: number; startDate?: string; endDate?: string },
    signal?: AbortSignal,
  ) =>
    apiClient.get<TimeBlockPage>(
      base(staffId),
      params as Record<string, string | number | undefined>,
      signal,
    ),
  create: (staffId: number, body: CreateTimeBlockRequest) =>
    apiClient.post<TimeBlockResponse>(base(staffId), body),
  update: (staffId: number, blockId: number, body: UpdateTimeBlockRequest) =>
    apiClient.put<TimeBlockResponse>(`${base(staffId)}/${blockId}`, body),
  get: (staffId: number, blockId: number) =>
    apiClient.get<TimeBlockResponse>(`${base(staffId)}/${blockId}`),
  cancel: (staffId: number, blockId: number) =>
    apiClient.post<TimeBlockResponse>(`${base(staffId)}/${blockId}/cancel`),
  remove: (staffId: number, blockId: number) =>
    apiClient.delete<void>(`${base(staffId)}/${blockId}`),
};

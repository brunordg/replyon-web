import { apiClient } from "./client";
import type { AvailableSlotsResponse, DailyAgendaResponse } from "./types";

const base = "/v1/availability";

export const availabilityApi = {
  slots: (
    staffId: number,
    params: { date: string; serviceId: number },
    signal?: AbortSignal,
  ) =>
    apiClient.get<AvailableSlotsResponse>(
      `${base}/staff/${staffId}/slots`,
      params,
      signal,
    ),
  /** NOTE: backend currently returns an empty slots list (stub). */
  dailyAgenda: (staffId: number, params: { date: string }, signal?: AbortSignal) =>
    apiClient.get<DailyAgendaResponse>(
      `${base}/staff/${staffId}/daily-agenda`,
      params,
      signal,
    ),
};

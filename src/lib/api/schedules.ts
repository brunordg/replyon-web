import { apiClient } from "./client";
import type {
  CreateScheduleRequest,
  SchedulePage,
  ScheduleResponse,
  UpdateScheduleRequest,
} from "./types";

const base = (staffId: number) => `/v1/staff/${staffId}/schedule`;

export const schedulesApi = {
  list: (staffId: number, params?: { page?: number; size?: number }, signal?: AbortSignal) =>
    apiClient.get<SchedulePage>(
      base(staffId),
      params as Record<string, number | undefined>,
      signal,
    ),
  get: (staffId: number, scheduleId: number) =>
    apiClient.get<ScheduleResponse>(`${base(staffId)}/${scheduleId}`),
  create: (staffId: number, body: CreateScheduleRequest) =>
    apiClient.post<ScheduleResponse>(base(staffId), body),
  update: (staffId: number, scheduleId: number, body: UpdateScheduleRequest) =>
    apiClient.put<ScheduleResponse>(`${base(staffId)}/${scheduleId}`, body),
  activate: (staffId: number, scheduleId: number) =>
    apiClient.post<ScheduleResponse>(`${base(staffId)}/${scheduleId}/activate`),
  deactivate: (staffId: number, scheduleId: number) =>
    apiClient.post<ScheduleResponse>(`${base(staffId)}/${scheduleId}/deactivate`),
  remove: (staffId: number, scheduleId: number) =>
    apiClient.delete<void>(`${base(staffId)}/${scheduleId}`),
};

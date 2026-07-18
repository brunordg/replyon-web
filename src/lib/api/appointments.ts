import { apiClient } from "./client";
import type {
  AppointmentPage,
  AppointmentResponse,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "./types";

const base = "/v1/appointments";

export interface AppointmentListParams {
  customerId?: number;
  page?: number;
  size?: number;
}

export const appointmentsApi = {
  /** List by customer (customerId required by the backend). */
  listByCustomer: (params: AppointmentListParams, signal?: AbortSignal) =>
    apiClient.get<AppointmentPage>(base, params as Record<string, number | undefined>, signal),
  listByStaff: (staffId: number, params?: { page?: number; size?: number }, signal?: AbortSignal) =>
    apiClient.get<AppointmentPage>(`${base}/staff/${staffId}`, params as Record<string, number | undefined>, signal),
  get: (id: number) => apiClient.get<AppointmentResponse>(`${base}/${id}`),
  create: (body: CreateAppointmentRequest) =>
    apiClient.post<AppointmentResponse>(base, body),
  update: (id: number, body: UpdateAppointmentRequest) =>
    apiClient.put<AppointmentResponse>(`${base}/${id}`, body),
  remove: (id: number) => apiClient.delete<void>(`${base}/${id}`),
  confirm: (id: number) =>
    apiClient.post<AppointmentResponse>(`${base}/${id}/confirm`),
  cancel: (id: number) =>
    apiClient.post<AppointmentResponse>(`${base}/${id}/cancel`),
  complete: (id: number) =>
    apiClient.post<AppointmentResponse>(`${base}/${id}/complete`),
  noShow: (id: number) =>
    apiClient.post<AppointmentResponse>(`${base}/${id}/no-show`),
};

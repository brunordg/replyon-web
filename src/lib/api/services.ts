import { apiClient } from "./client";
import type {
  CreateServiceRequest,
  ListParams,
  Page,
  ServiceResponse,
  StaffServiceResponse,
  UpdateServiceRequest,
} from "./types";

const base = "/v1/services";

export const servicesApi = {
  list: (params?: ListParams, signal?: AbortSignal) =>
    apiClient.get<Page<ServiceResponse>>(base, params as Record<string, string | number | undefined>, signal),
  get: (id: number) => apiClient.get<ServiceResponse>(`${base}/${id}`),
  create: (body: CreateServiceRequest) =>
    apiClient.post<ServiceResponse>(base, body),
  update: (id: number, body: UpdateServiceRequest) =>
    apiClient.put<ServiceResponse>(`${base}/${id}`, body),
  activate: (id: number) =>
    apiClient.post<ServiceResponse>(`${base}/${id}/activate`),
  deactivate: (id: number) =>
    apiClient.post<ServiceResponse>(`${base}/${id}/deactivate`),
  /** Staff ids assigned to a service. */
  staff: (serviceId: number) =>
    apiClient.get<StaffServiceResponse>(`${base}/${serviceId}/staff`),
};

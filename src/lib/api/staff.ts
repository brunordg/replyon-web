import { apiClient } from "./client";
import type {
  AssignServicesRequest,
  CreateStaffRequest,
  ListParams,
  Page,
  SetServiceCommissionRequest,
  StaffResponse,
  StaffServiceAssignmentResponse,
  StaffServiceResponse,
  UpdateStaffRequest,
} from "./types";

const base = "/v1/staff";

export const staffApi = {
  list: (params?: ListParams, signal?: AbortSignal) =>
    apiClient.get<Page<StaffResponse>>(base, params as Record<string, string | number | undefined>, signal),
  get: (id: number) => apiClient.get<StaffResponse>(`${base}/${id}`),
  create: (body: CreateStaffRequest) =>
    apiClient.post<StaffResponse>(base, body),
  update: (id: number, body: UpdateStaffRequest) =>
    apiClient.put<StaffResponse>(`${base}/${id}`, body),
  activate: (id: number) =>
    apiClient.post<StaffResponse>(`${base}/${id}/activate`),
  deactivate: (id: number) =>
    apiClient.post<StaffResponse>(`${base}/${id}/deactivate`),
  // Atribuição de serviços
  listServices: (staffId: number) =>
    apiClient.get<StaffServiceResponse>(`${base}/${staffId}/services`),
  assignServices: (staffId: number, body: AssignServicesRequest) =>
    apiClient.post<void>(`${base}/${staffId}/services`, body),
  unassignService: (staffId: number, serviceId: number) =>
    apiClient.delete<void>(`${base}/${staffId}/services/${serviceId}`),
  listServiceCommissions: (staffId: number) =>
    apiClient.get<StaffServiceAssignmentResponse[]>(`${base}/${staffId}/services/commissions`),
  setServiceCommission: (staffId: number, serviceId: number, body: SetServiceCommissionRequest) =>
    apiClient.put<void>(`${base}/${staffId}/services/${serviceId}/commission`, body),
};

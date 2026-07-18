import { apiClient } from "./client";
import type {
  CreateCustomerRequest,
  CustomerResponse,
  ListParams,
  Page,
  UpdateCustomerRequest,
} from "./types";

const base = "/v1/customers";

export const customersApi = {
  list: (params?: ListParams, signal?: AbortSignal) =>
    apiClient.get<Page<CustomerResponse>>(base, params as Record<string, string | number | undefined>, signal),
  get: (id: number) => apiClient.get<CustomerResponse>(`${base}/${id}`),
  create: (body: CreateCustomerRequest) =>
    apiClient.post<CustomerResponse>(base, body),
  update: (id: number, body: UpdateCustomerRequest) =>
    apiClient.put<CustomerResponse>(`${base}/${id}`, body),
  activate: (id: number) =>
    apiClient.post<CustomerResponse>(`${base}/${id}/activate`),
  deactivate: (id: number) =>
    apiClient.post<CustomerResponse>(`${base}/${id}/deactivate`),
};

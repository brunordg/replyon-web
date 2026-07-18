import { apiClient } from "./client";
import type {
  CompanyResponse,
  CreateCompanyRequest,
  ListParams,
  Page,
  SignUpRequest,
  SignUpResponse,
  UpdateCompanyRequest,
} from "./types";

const base = "/v1/companies";

export const companiesApi = {
  /** Public — creates company + admin user. */
  signup: (body: SignUpRequest) =>
    apiClient.post<SignUpResponse>(`${base}/signup`, body),
  list: (params?: ListParams, signal?: AbortSignal) =>
    apiClient.get<Page<CompanyResponse>>(base, params as Record<string, string | number | undefined>, signal),
  get: (id: number) => apiClient.get<CompanyResponse>(`${base}/${id}`),
  create: (body: CreateCompanyRequest) =>
    apiClient.post<CompanyResponse>(base, body),
  update: (id: number, body: UpdateCompanyRequest) =>
    apiClient.put<CompanyResponse>(`${base}/${id}`, body),
  activate: (id: number) =>
    apiClient.post<CompanyResponse>(`${base}/${id}/activate`),
  deactivate: (id: number) =>
    apiClient.post<CompanyResponse>(`${base}/${id}/deactivate`),
};

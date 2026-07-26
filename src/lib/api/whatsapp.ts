import { apiClient } from "./client";
import type { WhatsAppConnectionResponse } from "./types";

const base = "/v1/companies";

export const whatsappApi = {
  status: (companyId: number, signal?: AbortSignal) =>
    apiClient.get<WhatsAppConnectionResponse>(`${base}/${companyId}/whatsapp`, undefined, signal),
  connect: (companyId: number) =>
    apiClient.post<WhatsAppConnectionResponse>(`${base}/${companyId}/whatsapp/connect`),
  disconnect: (companyId: number) =>
    apiClient.post<WhatsAppConnectionResponse>(`${base}/${companyId}/whatsapp/disconnect`),
};

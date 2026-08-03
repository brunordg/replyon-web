import { apiClient } from "./client";
import type { ConversationMessageResponse, CustomerResponse, HandoffConversationResponse } from "./types";

const base = "/v1/conversations";

export const conversationsApi = {
  /** Conversations currently awaiting/in a human handoff for the current tenant. */
  listOpenHandoffs: (signal?: AbortSignal) =>
    apiClient.get<HandoffConversationResponse[]>(base, { status: "handoff" }, signal),

  /** Full persisted message thread for one conversation. */
  getThread: (phone: string, signal?: AbortSignal) =>
    apiClient.get<ConversationMessageResponse[]>(`${base}/${encodeURIComponent(phone)}/messages`, undefined, signal),

  /** Sends a reply as a human, delivered through WAHA and renews the handoff window. */
  sendReply: (phone: string, body: string) =>
    apiClient.post<ConversationMessageResponse>(`${base}/${encodeURIComponent(phone)}/messages`, { body }),

  /** Manually ends the handoff ("encerrar atendimento"), resuming the bot. */
  resolveHandoff: (phone: string) =>
    apiClient.post<void>(`${base}/${encodeURIComponent(phone)}/resolve`),

  /**
   * Registers a customer for this conversation's phone using only a name —
   * for booking inline when the conversation has no linked customer yet.
   * Idempotent: the backend returns the existing customer if one now matches.
   */
  createCustomer: (phone: string, name: string) =>
    apiClient.post<CustomerResponse>(`${base}/${encodeURIComponent(phone)}/customer`, { name }),
};

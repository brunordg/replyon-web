import { apiClient } from "./client";
import type { ConversationMessageResponse, CustomerResponse, HandoffConversationResponse } from "./types";

const base = "/v1/conversations";

export const conversationsApi = {
  /** Conversas atualmente aguardando/em handoff humano para o tenant atual. */
  listOpenHandoffs: (signal?: AbortSignal) =>
    apiClient.get<HandoffConversationResponse[]>(base, { status: "handoff" }, signal),

  /** Thread completa de mensagens persistidas de uma conversa. */
  getThread: (phone: string, signal?: AbortSignal) =>
    apiClient.get<ConversationMessageResponse[]>(`${base}/${encodeURIComponent(phone)}/messages`, undefined, signal),

  /** Envia uma resposta como humano, entregue via WAHA, e renova a janela de handoff. */
  sendReply: (phone: string, body: string) =>
    apiClient.post<ConversationMessageResponse>(`${base}/${encodeURIComponent(phone)}/messages`, { body }),

  /** Encerra manualmente o handoff ("encerrar atendimento"), retomando o bot. */
  resolveHandoff: (phone: string) =>
    apiClient.post<void>(`${base}/${encodeURIComponent(phone)}/resolve`),

  /**
   * Registra um cliente para o telefone desta conversa usando apenas um nome
   * — para agendamento inline quando a conversa ainda não tem cliente vinculado.
   * Idempotente: o backend retorna o cliente existente se algum já combinar.
   */
  createCustomer: (phone: string, name: string) =>
    apiClient.post<CustomerResponse>(`${base}/${encodeURIComponent(phone)}/customer`, { name }),
};

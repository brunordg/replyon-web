import type { AppointmentOrigin, AppointmentStatus, EntityStatus, PaymentMethod, WahaConnectionStatus } from "./types";

// Status do agendamento -> rótulo em português + a classe de estilo do badge usada na UI.
export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

export const APPOINTMENT_STATUS_STYLE: Record<AppointmentStatus, string> = {
  PENDING: "bg-warn-bg text-warn",
  CONFIRMED: "bg-ok-bg text-ok",
  COMPLETED: "bg-done-bg text-done",
  CANCELLED: "bg-info-bg text-info",
  NO_SHOW: "bg-danger-bg text-danger",
};

// Status de entidade (cliente/serviço/profissional/empresa) -> rótulo em português.
export const ENTITY_STATUS_LABEL: Record<EntityStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const ENTITY_STATUS_STYLE: Record<EntityStatus, string> = {
  ACTIVE: "bg-ok-bg text-ok",
  INACTIVE: "bg-warn-bg text-warn",
};

// Status de conexão WAHA do WhatsApp -> rótulo em português + estilo do badge.
export const WHATSAPP_STATUS_LABEL: Record<WahaConnectionStatus, string> = {
  DISCONNECTED: "Desconectado",
  CONNECTING: "Conectando…",
  CONNECTED: "Conectado",
  FAILED: "Falha na conexão",
};

export const WHATSAPP_STATUS_STYLE: Record<WahaConnectionStatus, string> = {
  DISCONNECTED: "bg-warn-bg text-warn",
  CONNECTING: "bg-info-bg text-info",
  CONNECTED: "bg-ok-bg text-ok",
  FAILED: "bg-danger-bg text-danger",
};

// Forma de pagamento (capturada quando um agendamento é concluído) -> rótulo em português.
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
};

export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"];

// Como o agendamento foi feito -> rótulo em português.
export const APPOINTMENT_ORIGIN_LABEL: Record<AppointmentOrigin, string> = {
  WHATSAPP: "WhatsApp",
  MANUAL: "Manual",
};

export const APPOINTMENT_ORIGINS: AppointmentOrigin[] = ["WHATSAPP", "MANUAL"];

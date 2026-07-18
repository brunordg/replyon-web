import type { AppointmentStatus, EntityStatus } from "./types";

// Appointment status -> Portuguese label + the existing badge style class used in the UI.
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

// Entity (customer/service/staff/company) status -> Portuguese segment label.
export const ENTITY_STATUS_LABEL: Record<EntityStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const ENTITY_STATUS_STYLE: Record<EntityStatus, string> = {
  ACTIVE: "bg-ok-bg text-ok",
  INACTIVE: "bg-warn-bg text-warn",
};

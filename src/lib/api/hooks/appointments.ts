import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsApi, type AppointmentListParams } from "../appointments";
import { ApiError } from "../client";
import type { AppointmentResponse, CreateAppointmentRequest } from "../types";

const KEY = "appointments";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useAppointmentsByCustomer(params: AppointmentListParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, "customer", params],
    queryFn: ({ signal }) => appointmentsApi.listByCustomer(params, signal),
    enabled: enabled && params.customerId != null,
    placeholderData: (prev) => prev,
  });
}

export function useAppointmentsByStaff(
  staffId: number | undefined,
  params?: { page?: number; size?: number },
) {
  return useQuery({
    queryKey: [KEY, "staff", staffId, params ?? {}],
    queryFn: ({ signal }) => appointmentsApi.listByStaff(staffId as number, params, signal),
    enabled: staffId != null,
    placeholderData: (prev) => prev,
  });
}

/**
 * Aggregates appointments across every staff member — the backend has no
 * "list all appointments for the tenant" endpoint, only per-staff/per-customer.
 * Fan-out over the provided staff ids; each appointment belongs to one staff,
 * so no de-duplication is needed.
 */
export function useAllAppointmentsByStaff(staffIds: number[], size = 200) {
  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [KEY, "staff", id, { size, all: true }],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        appointmentsApi.listByStaff(id, { size }, signal),
      enabled: staffIds.length > 0,
    })),
  });

  const appointments: AppointmentResponse[] = results.flatMap((r) => r.data?.appointments ?? []);

  return {
    appointments,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    error: results.find((r) => r.isError)?.error,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAppointmentRequest) => appointmentsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Agendamento criado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível criar o agendamento")),
  });
}

/**
 * Creates an appointment and, when the user picked "Confirmado" as the initial
 * status, confirms it in a second call — CreateAppointmentRequest carries no
 * status field, so the backend always starts an appointment as PENDING.
 */
export function useCreateAppointmentWithStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, confirm }: { body: CreateAppointmentRequest; confirm: boolean }) => {
      const created = await appointmentsApi.create(body);
      return confirm ? appointmentsApi.confirm(created.id) : created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Agendamento criado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível criar o agendamento")),
  });
}

export type AppointmentAction = "confirm" | "cancel" | "complete" | "no-show";

const ACTION_LABEL: Record<AppointmentAction, string> = {
  confirm: "confirmado",
  cancel: "cancelado",
  complete: "concluído",
  "no-show": "marcado como falta",
};

export function useAppointmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: AppointmentAction }) => {
      switch (action) {
        case "confirm":
          return appointmentsApi.confirm(id);
        case "cancel":
          return appointmentsApi.cancel(id);
        case "complete":
          return appointmentsApi.complete(id);
        case "no-show":
          return appointmentsApi.noShow(id);
      }
    },
    onSuccess: (_data, { action }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(`Agendamento ${ACTION_LABEL[action]}`);
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar o agendamento")),
  });
}

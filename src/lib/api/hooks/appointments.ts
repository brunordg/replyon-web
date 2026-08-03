import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsApi, type AppointmentListParams } from "../appointments";
import { ApiError } from "../client";
import type { AppointmentResponse, CreateAppointmentRequest, PaymentMethod } from "../types";

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
 * Agrega agendamentos de todos os profissionais — o backend não tem um
 * endpoint "listar todos os agendamentos do tenant", apenas por
 * profissional/cliente. Faz fan-out sobre os ids de profissional informados;
 * cada agendamento pertence a um único profissional, então não é preciso
 * deduplicar.
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
 * Cria um agendamento e, quando o usuário escolheu "Confirmado" como status
 * inicial, confirma numa segunda chamada — CreateAppointmentRequest não
 * carrega um campo de status, então o backend sempre inicia um agendamento
 * como PENDING.
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

export type AppointmentAction = "confirm" | "cancel" | "no-show";

const ACTION_LABEL: Record<AppointmentAction, string> = {
  confirm: "confirmado",
  cancel: "cancelado",
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

/**
 * Concluir um agendamento exige uma forma de pagamento (capturada via um
 * diálogo de confirmação), diferente das outras ações rápidas — mantido
 * separado de useAppointmentAction em vez de alargar seu formato genérico
 * para um único caso.
 */
export function useCompleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: number; paymentMethod: PaymentMethod }) =>
      appointmentsApi.complete(id, { paymentMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Agendamento concluído");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível concluir o agendamento")),
  });
}

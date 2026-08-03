import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { schedulesApi } from "../schedules";
import { ApiError } from "../client";
import type { UpdateScheduleRequest } from "../types";

const KEY = "schedules";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * A agenda de um profissional, ou `null` quando ele ainda não tem nenhuma.
 * O backend permite apenas uma agenda por (profissional, tenant), então lemos
 * o primeiro item do endpoint de listagem em vez de paginar.
 */
export function useStaffSchedule(staffId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [KEY, staffId],
    queryFn: ({ signal }) => schedulesApi.list(staffId as number, { size: 1 }, signal),
    enabled: enabled && staffId != null,
    select: (res) => res.schedules[0] ?? null,
  });
}

/**
 * Salva o horário de trabalho de um profissional: cria a agenda no primeiro
 * salvamento, atualiza depois disso. `scheduleId` distingue os dois casos.
 */
export function useSaveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      staffId,
      scheduleId,
      body,
    }: {
      staffId: number;
      scheduleId: number | null;
      body: UpdateScheduleRequest;
    }) =>
      scheduleId == null
        ? schedulesApi.create(staffId, { ...body, staffId })
        : schedulesApi.update(staffId, scheduleId, body),
    onSuccess: (_data, { staffId }) => {
      qc.invalidateQueries({ queryKey: [KEY, staffId] });
      toast.success("Horários salvos");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível salvar os horários")),
  });
}

export function useSetScheduleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      staffId,
      scheduleId,
      active,
    }: {
      staffId: number;
      scheduleId: number;
      active: boolean;
    }) =>
      active
        ? schedulesApi.activate(staffId, scheduleId)
        : schedulesApi.deactivate(staffId, scheduleId),
    onSuccess: (_data, { staffId }) => {
      qc.invalidateQueries({ queryKey: [KEY, staffId] });
      toast.success("Status da agenda atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível alterar o status da agenda")),
  });
}

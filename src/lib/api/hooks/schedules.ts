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
 * The schedule of a staff member, or `null` when they have none yet.
 * The backend allows only one schedule per (staff, tenant), so we read the
 * first item of the list endpoint instead of paging.
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
 * Saves a staff member's working hours: creates the schedule on first save,
 * updates it afterwards. `scheduleId` tells the two apart.
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

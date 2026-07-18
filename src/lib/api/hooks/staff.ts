import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { staffApi } from "../staff";
import { ApiError } from "../client";
import type { CreateStaffRequest, ListParams, UpdateStaffRequest } from "../types";

const KEY = "staff";
const SERVICES_KEY = "staff-services";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useStaffList(params?: ListParams) {
  return useQuery({
    queryKey: [KEY, params ?? {}],
    queryFn: ({ signal }) => staffApi.list(params, signal),
    placeholderData: (prev) => prev,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffRequest) => staffApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Profissional criado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível criar o profissional")),
  });
}

/**
 * Creates a staff member and, if any services are selected, assigns them in a
 * second call (POST /staff/{id}/services) — the backend has no single endpoint
 * that does both at once.
 */
export function useCreateStaffWithServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      staff,
      serviceIds,
    }: {
      staff: CreateStaffRequest;
      serviceIds: number[];
    }) => {
      const created = await staffApi.create(staff);
      if (serviceIds.length > 0) {
        await staffApi.assignServices(created.id, { serviceIds });
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Profissional criado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível criar o profissional")),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateStaffRequest }) =>
      staffApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Profissional atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar o profissional")),
  });
}

/** Service ids currently assigned to a staff member. */
export function useStaffServices(staffId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [SERVICES_KEY, staffId],
    queryFn: () => staffApi.listServices(staffId as number),
    enabled: enabled && staffId != null,
    select: (res) => res.serviceIds,
  });
}

/**
 * Updates a staff member and reconciles its service assignments: assigns the
 * newly-selected ids and unassigns the removed ones (the backend exposes only
 * per-id assign/unassign, so we diff against the current selection).
 */
export function useUpdateStaffWithServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
      serviceIds,
      currentServiceIds,
    }: {
      id: number;
      body: UpdateStaffRequest;
      serviceIds: number[];
      currentServiceIds: number[];
    }) => {
      await staffApi.update(id, body);
      const current = new Set(currentServiceIds);
      const next = new Set(serviceIds);
      const toAdd = serviceIds.filter((sid) => !current.has(sid));
      const toRemove = currentServiceIds.filter((sid) => !next.has(sid));
      if (toAdd.length > 0) await staffApi.assignServices(id, { serviceIds: toAdd });
      for (const sid of toRemove) await staffApi.unassignService(id, sid);
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [SERVICES_KEY, id] });
      toast.success("Profissional atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar o profissional")),
  });
}

export function useSetStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? staffApi.activate(id) : staffApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Status atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível alterar o status")),
  });
}

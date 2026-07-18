import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { staffApi } from "../staff";
import { ApiError } from "../client";
import type {
  CreateStaffRequest,
  ListParams,
  StaffServiceResponse,
  UpdateStaffRequest,
} from "../types";

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
 * Assigned service ids for every given staff member, as a Map.
 *
 * The backend only answers "which services does staff X do?" one staff at a
 * time (GET /staff/{id}/services), so we fan out — same shape as
 * `useAllAppointmentsByStaff`. Staff lists are small and the responses are just
 * id arrays, and react-query dedupes these with the per-staff `useStaffServices`
 * calls since both share the `[SERVICES_KEY, id]` key.
 */
export function useStaffServicesMap(staffIds: number[], enabled = true) {
  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [SERVICES_KEY, id],
      queryFn: () => staffApi.listServices(id),
      enabled,
      select: (res: StaffServiceResponse) => res.serviceIds,
    })),
  });

  // Don't block on the slowest member: loading means nothing has arrived,
  // error means everything failed. A partial failure degrades to that staff
  // simply not being offered.
  const hasAny = results.some((r) => r.data);
  const isLoading = !hasAny && results.some((r) => r.isLoading);
  const isError = results.length > 0 && results.every((r) => r.isError);

  // `useQueries` hands back a fresh array each render, so the Map has to be
  // memoized on the *contents* — otherwise every consumer's useMemo/useEffect
  // that depends on it re-runs on every render.
  const signature = JSON.stringify(staffIds.map((id, i) => [id, results[i]?.data ?? null]));

  const byStaffId = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const [id, ids] of JSON.parse(signature) as [number, number[] | null][]) {
      if (ids) map.set(id, ids);
    }
    return map;
  }, [signature]);

  return { byStaffId, isLoading, isError };
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

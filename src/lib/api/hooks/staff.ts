import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { staffApi } from "../staff";
import { ApiError } from "../client";
import type {
  CreateStaffRequest,
  ListParams,
  SetServiceCommissionRequest,
  StaffServiceResponse,
  UpdateStaffRequest,
} from "../types";

const KEY = "staff";
const SERVICES_KEY = "staff-services";
const COMMISSIONS_KEY = "staff-service-commissions";

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
 * Cria um profissional e, se algum serviço estiver selecionado, atribui-os
 * numa segunda chamada (POST /staff/{id}/services) — o backend não tem um
 * único endpoint que faça as duas coisas de uma vez.
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

/** Ids de serviço atualmente atribuídos a um profissional. */
export function useStaffServices(staffId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [SERVICES_KEY, staffId],
    queryFn: () => staffApi.listServices(staffId as number),
    enabled: enabled && staffId != null,
    select: (res) => res.serviceIds,
  });
}

/**
 * Ids de serviço atribuídos a cada profissional informado, como um Map.
 *
 * O backend só responde "quais serviços o profissional X faz?" um por vez
 * (GET /staff/{id}/services), então fazemos fan-out — mesmo formato de
 * `useAllAppointmentsByStaff`. Listas de profissionais são pequenas e as
 * respostas são apenas arrays de id, e o react-query deduplica isso com as
 * chamadas por profissional de `useStaffServices` já que ambas compartilham a
 * chave `[SERVICES_KEY, id]`.
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

  // Não bloqueia pelo membro mais lento: loading significa que nada chegou,
  // error significa que tudo falhou. Uma falha parcial degrada para aquele
  // profissional simplesmente não ser oferecido.
  const hasAny = results.some((r) => r.data);
  const isLoading = !hasAny && results.some((r) => r.isLoading);
  const isError = results.length > 0 && results.every((r) => r.isError);

  // `useQueries` devolve um array novo a cada renderização, então o Map
  // precisa ser memoizado pelo *conteúdo* — senão o useMemo/useEffect de todo
  // consumidor que dependa dele reexecuta a cada renderização.
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

/** Percentual de comissão de cada serviço atribuído a um profissional, por serviceId. */
export function useStaffServiceCommissions(staffId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [COMMISSIONS_KEY, staffId],
    queryFn: () => staffApi.listServiceCommissions(staffId as number),
    enabled: enabled && staffId != null,
    select: (assignments) => new Map(assignments.map((a) => [a.serviceId, a.commissionPercentage])),
  });
}

export function useSetServiceCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      staffId,
      serviceId,
      body,
    }: {
      staffId: number;
      serviceId: number;
      body: SetServiceCommissionRequest;
    }) => staffApi.setServiceCommission(staffId, serviceId, body),
    onSuccess: (_data, { staffId }) => {
      qc.invalidateQueries({ queryKey: [COMMISSIONS_KEY, staffId] });
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível salvar a comissão")),
  });
}

/**
 * Atualiza um profissional e reconcilia suas atribuições de serviço: atribui
 * os ids recém-selecionados e desatribui os removidos (o backend só expõe
 * assign/unassign por id, então comparamos com a seleção atual).
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

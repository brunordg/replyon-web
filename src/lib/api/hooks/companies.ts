import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { companiesApi } from "../companies";
import { ApiError } from "../client";
import type { UpdateCompanyRequest } from "../types";

const KEY = "companies";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useCompany(id: number | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => companiesApi.get(id as number),
    enabled: id != null,
  });
}

/**
 * A própria empresa do tenant. O token carrega apenas tenant_id (sem id de
 * empresa), e o endpoint de listagem é escopado por tenant, então a primeira
 * linha é a empresa deste tenant.
 */
export function useMyCompany() {
  return useQuery({
    queryKey: [KEY, "mine"],
    queryFn: ({ signal }) => companiesApi.list({ size: 1 }, signal),
    select: (page) => page.content[0] ?? null,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCompanyRequest }) =>
      companiesApi.update(id, body),
    onSuccess: () => {
      // Invalida a chave inteira: a empresa é cacheada tanto por id quanto sob
      // "mine" (ver useMyCompany), e um salvamento precisa atualizar ambos.
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Empresa atualizada");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar a empresa")),
  });
}

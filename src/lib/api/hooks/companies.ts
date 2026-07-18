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
 * The tenant's own company. The token only carries tenant_id (no company id),
 * and the list endpoint is tenant-scoped, so the first row is this tenant's company.
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
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, id] });
      toast.success("Empresa atualizada");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar a empresa")),
  });
}

import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { timeBlocksApi } from "../timeblocks";
import type { CreateTimeBlockRequest, TimeBlockResponse, UpdateTimeBlockRequest } from "../types";

const KEY = "timeblocks";

/** O próprio bloqueio, sem o profissional a quem pertence. */
export type TimeBlockDraft = Omit<CreateTimeBlockRequest, "staffId">;

/** Limites "YYYY-MM-DD" inclusivos; o backend os aplica. */
export interface TimeBlockRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Agrega bloqueios de horário de todos os profissionais (sem endpoint
 * abrangendo todo o tenant).
 *
 * O intervalo é repassado à API em vez de filtrado aqui — é o servidor quem
 * sabe que um bloqueio recorrente ancorado antes da janela ainda ocorre
 * dentro dela, e filtrar no client descartaria exatamente esses.
 */
export function useAllTimeBlocks(staffIds: number[], range: TimeBlockRange = {}, size = 100) {
  const { startDate, endDate } = range;

  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [KEY, "staff", id, { size, startDate, endDate }],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        timeBlocksApi.list(id, { size, startDate, endDate }, signal),
      enabled: staffIds.length > 0,
    })),
  });

  const blocks: TimeBlockResponse[] = results.flatMap((r) => r.data?.timeBlocks ?? []);

  // Mesma regra do fan-out de disponibilidade: um profissional inalcançável
  // não pode esconder os bloqueios de todos os outros. Loading significa que
  // nada chegou; error significa que tudo falhou.
  const hasAny = results.some((r) => r.data);
  return {
    blocks,
    isLoading: !hasAny && results.some((r) => r.isLoading),
    isError: results.length > 0 && results.every((r) => r.isError),
    error: results.find((r) => r.isError)?.error,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

/**
 * Cria o mesmo bloqueio para um ou mais profissionais.
 *
 * "Todos" é uma conveniência do frontend, não um conceito do backend —
 * `TimeBlock` sempre pertence a exatamente um profissional. Então o diálogo
 * faz fan-out de uma criação por profissional e a listagem reagrupa os
 * irmãos de volta num único card.
 *
 * `allSettled` de propósito: com dez profissionais, uma falha não deveria
 * descartar os nove bloqueios que foram criados.
 */
export function useCreateTimeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffIds, block }: { staffIds: number[]; block: TimeBlockDraft }) => {
      const settled = await Promise.allSettled(
        staffIds.map((staffId) => timeBlocksApi.create(staffId, { ...block, staffId })),
      );
      const failed = settled.filter((r) => r.status === "rejected").length;
      if (failed === staffIds.length) {
        throw (settled[0] as PromiseRejectedResult).reason;
      }
      return { created: staffIds.length - failed, failed };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Aplica uma edição a cada irmão de um bloqueio agrupado. */
export function useUpdateTimeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targets,
      patch,
    }: {
      targets: { staffId: number; id: number }[];
      patch: UpdateTimeBlockRequest;
    }) => {
      await Promise.all(targets.map((t) => timeBlocksApi.update(t.staffId, t.id, patch)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Remove cada irmão de um bloqueio agrupado. */
export function useDeleteTimeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targets: { staffId: number; id: number }[]) => {
      await Promise.all(targets.map((t) => timeBlocksApi.remove(t.staffId, t.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

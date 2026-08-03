import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { availabilityApi } from "../availability";
import type { AvailableSlotsResponse } from "../types";
import { normalizeTime } from "@/lib/appointment-slots";

const KEY = "availability";

export function useAvailableSlots(
  staffId: number | undefined,
  params: { date: string; serviceId: number | undefined },
) {
  return useQuery({
    queryKey: [KEY, "slots", staffId, params.date, params.serviceId],
    queryFn: ({ signal }) =>
      availabilityApi.slots(
        staffId as number,
        { date: params.date, serviceId: params.serviceId as number },
        signal,
      ),
    enabled: staffId != null && params.serviceId != null && !!params.date,
  });
}

/**
 * Horários de início disponíveis para um serviço numa data, por profissional.
 *
 * O endpoint de horários responde para um profissional por vez, então agendar
 * "pelo horário primeiro" — escolher 09:00 e depois ver quem está livre —
 * precisa de um fan-out sobre todo profissional elegível para o serviço.
 * `allSlots` é a união (qualquer horário que pelo menos um profissional
 * consiga atender), e `staffAvailableAt` responde a pergunta inversa.
 *
 * Os horários são normalizados para "HH:mm" aqui para que quem chama possa
 * compará-los diretamente.
 */
export function useSlotsByStaff(
  staffIds: number[],
  params: { date: string; serviceId: number | undefined },
  enabled = true,
) {
  const active = enabled && params.serviceId != null && !!params.date;

  const results = useQueries({
    queries: staffIds.map((id) => ({
      queryKey: [KEY, "slots", id, params.date, params.serviceId],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        availabilityApi.slots(
          id,
          { date: params.date, serviceId: params.serviceId as number },
          signal,
        ),
      enabled: active,
      // Um profissional sem agenda é uma resposta determinística, não uma
      // falha passageira — as 3 tentativas padrão com backoff só esticariam
      // isso num carregamento falso.
      retry: 1,
    })),
  });

  // Um fan-out não pode ficar refém do membro mais lento ou mais quebrado: um
  // profissional sem agenda não pode esconder os horários de todos os outros.
  // Então "loading" significa que *nada* chegou ainda, e "error" significa
  // que *tudo* falhou. Uma falha parcial degrada para aquele profissional
  // simplesmente não ser oferecido.
  const hasAny = results.some((r) => r.data);
  const isLoading = active && !hasAny && results.some((r) => r.isLoading);
  const isError = active && results.length > 0 && results.every((r) => r.isError);
  /** Profissionais cuja disponibilidade não pôde ser lida — silenciosamente ausentes das listas. */
  const unavailableCount = results.filter((r) => r.isError).length;
  const serviceDurationMinutes = results.find((r) => r.data)?.data?.serviceDurationMinutes;

  // Memoizado pelo conteúdo — `useQueries` retorna um array novo a cada renderização.
  const signature = JSON.stringify(
    staffIds.map((id, i) => [
      id,
      (results[i]?.data as AvailableSlotsResponse | undefined)?.availableSlots ?? null,
    ]),
  );

  const { slotsByStaff, allSlots } = useMemo(() => {
    const map = new Map<number, string[]>();
    const union = new Set<string>();
    for (const [id, raw] of JSON.parse(signature) as [number, string[] | null][]) {
      if (!raw) continue;
      const times = raw.map(normalizeTime);
      map.set(id, times);
      times.forEach((t) => union.add(t));
    }
    return { slotsByStaff: map, allSlots: [...union].sort() };
  }, [signature]);

  /** Ids dos profissionais que podem iniciar o serviço em `time`. */
  const staffAvailableAt = useMemo(
    () => (time: string) =>
      [...slotsByStaff.entries()].filter(([, times]) => times.includes(time)).map(([id]) => id),
    [slotsByStaff],
  );

  return {
    slotsByStaff,
    allSlots,
    staffAvailableAt,
    isLoading,
    isError,
    unavailableCount,
    serviceDurationMinutes,
  };
}

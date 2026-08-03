// Auxiliares para o seletor de horário do "Novo agendamento".
//
// O backend é dono da disponibilidade: GET /v1/availability/staff/{id}/slots recebe
// o serviceId e retorna apenas os horários de início em que o serviço *inteiro*
// cabe — então um serviço de 70 minutos numa grade de 30 minutos já exclui
// qualquer início que não tenha 3 slots livres consecutivos. Esses auxiliares não
// recalculam isso; eles derivam o tamanho da grade a partir dos horários
// retornados, para que a UI possa explicar o que um horário escolhido realmente
// consome ("09:00 – 10:10 · 3 slots de 30 min").

/** "09:00:00" | "09:00" -> "09:00". Retorna o valor de entrada inalterado se não puder ser interpretado. */
export function normalizeTime(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return raw;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Minutos desde a meia-noite, ou NaN. */
export function timeToMinutes(raw: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  const base = timeToMinutes(time);
  if (Number.isNaN(base)) return time;
  return minutesToTime(base + minutes);
}

/**
 * A granularidade da grade, inferida a partir do menor intervalo entre horários
 * de início disponíveis consecutivos. É undefined quando há menos de dois slots
 * (um único horário não diz nada sobre o espaçamento) ou quando nenhum intervalo
 * pode ser interpretado.
 *
 * Inferir é melhor do que ler o `intervalBetweenAppointments` da agenda do
 * profissional: esse campo é o espaçamento *entre* agendamentos, não a grade que
 * o backend de fato emite, e os dois não têm garantia de coincidir.
 */
export function detectSlotMinutes(slots: string[]): number | undefined {
  const mins = slots.map(timeToMinutes).filter((n) => !Number.isNaN(n));
  if (mins.length < 2) return undefined;
  const sorted = [...mins].sort((a, b) => a - b);
  let smallest = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 0 && gap < smallest) smallest = gap;
  }
  return Number.isFinite(smallest) ? smallest : undefined;
}

/** Quantos slots da grade um serviço de `durationMinutes` ocupa. */
export function slotsRequired(
  durationMinutes: number,
  slotMinutes: number | undefined,
): number | undefined {
  if (!slotMinutes || slotMinutes <= 0 || !durationMinutes || durationMinutes <= 0) {
    return undefined;
  }
  return Math.ceil(durationMinutes / slotMinutes);
}

/** "YYYY-MM-DD" em horário local — nunca via toISOString(), que converte para UTC. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Datetime ISO local que o backend espera, ex.: "2026-07-18T09:00:00". */
export function toLocalDateTime(date: Date, time: string): string {
  return `${toDateParam(date)}T${normalizeTime(time)}:00`;
}

/** "18 de julho de 2026" */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

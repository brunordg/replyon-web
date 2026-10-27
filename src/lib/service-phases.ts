export const PHASES_EXCEED_DURATION_MESSAGE = "A soma das fases não pode passar da duração total.";

// Campos vazios contam como 0; a validação "mínimo 1 minuto" fica com o chamador.
export function phasesExceedDuration(
  duration: string,
  activeMinutesBefore: string,
  waitMinutes: string,
): boolean {
  const durationNum = Number(duration);
  if (!Number.isInteger(durationNum) || durationNum < 1) return false;
  return (Number(activeMinutesBefore) || 0) + (Number(waitMinutes) || 0) > durationNum;
}

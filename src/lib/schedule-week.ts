// Modelo do lado do editor para a semana de trabalho de um profissional.
//
// A API mantém uma lista simples de janelas (ver ScheduleResponse); o editor
// transforma isso em um mapa por dia para que cada linha possa ser ativada e
// editada de forma independente, incluindo dias sem nenhuma janela na agenda.
// Tudo aqui trabalha com strings "HH:mm" para casar com <input type="time">;
// a conversão para o "HH:mm:ss" da API acontece nas bordas `toWeekState` /
// `toScheduleRequest`.

import { API_DAY_OF_WEEK, SCHEDULE_DAYS, SCHEDULE_DAY_BY_API } from "@/lib/api/types";
import type {
  ScheduleDay,
  ScheduleResponse,
  ScheduleWindowRequest,
  UpdateScheduleRequest,
} from "@/lib/api/types";

export const DAY_LABEL: Record<ScheduleDay, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

export const WEEKDAYS: ScheduleDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
export const WEEKEND: ScheduleDay[] = ["saturday", "sunday"];

/** Uma única janela de trabalho contínua dentro de um dia. */
export interface Window {
  id: string;
  start: string; // "HH:mm"
  end: string;
}

export interface DayState {
  enabled: boolean;
  windows: Window[];
}

export type WeekState = Record<ScheduleDay, DayState>;

let windowSeq = 0;
/** As janelas precisam de uma chave estável que sobreviva a reordenações, por isso carregam um id. */
export function makeWindow(start: string, end: string): Window {
  windowSeq += 1;
  return { id: `w${windowSeq}`, start, end };
}

export function buildWeek(days: ScheduleDay[], windows: [string, string][]): WeekState {
  return SCHEDULE_DAYS.reduce((acc, day) => {
    const on = days.includes(day);
    acc[day] = {
      enabled: on,
      windows: on ? windows.map(([s, e]) => makeWindow(s, e)) : [makeWindow("09:00", "18:00")],
    };
    return acc;
  }, {} as WeekState);
}

export const DEFAULT_WEEK = (): WeekState =>
  buildWeek(WEEKDAYS, [
    ["09:00", "12:00"],
    ["13:00", "18:00"],
  ]);

/** "09:00:00" (LocalTime na API) -> "09:00" para <input type="time">. */
function toInputTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * Inicializa o editor a partir da agenda persistida, agrupando a lista simples
 * de janelas por dia. Um dia sem janela é renderizado como desativado,
 * pré-preenchido com um padrão sensato para que, ao ativá-lo, o usuário tenha
 * algo para editar.
 */
export function toWeekState(schedule: ScheduleResponse): WeekState {
  const byDay = new Map<ScheduleDay, Window[]>();
  for (const w of schedule.windows ?? []) {
    const day = SCHEDULE_DAY_BY_API[w.dayOfWeek];
    if (!day) continue; // ignora qualquer nome de dia desconhecido
    const list = byDay.get(day) ?? [];
    list.push(makeWindow(toInputTime(w.startTime), toInputTime(w.endTime)));
    byDay.set(day, list);
  }

  return SCHEDULE_DAYS.reduce((acc, day) => {
    const windows = byDay.get(day) ?? [];
    acc[day] =
      windows.length > 0
        ? { enabled: true, windows }
        : { enabled: false, windows: [makeWindow("09:00", "18:00")] };
    return acc;
  }, {} as WeekState);
}

/** Minutos desde a meia-noite, ou NaN quando o valor está incompleto. */
export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
}

/** "HH:mm" a partir de minutos desde a meia-noite. */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function weeklyTotalHours(week: WeekState): number {
  let total = 0;
  for (const day of SCHEDULE_DAYS) {
    if (!week[day].enabled) continue;
    for (const w of week[day].windows) {
      const span = minutes(w.end) - minutes(w.start);
      if (Number.isFinite(span) && span > 0) total += span;
    }
  }
  return total / 60;
}

/** Validação por dia: janelas completas, ordenadas e sem sobreposição. */
export function validateWeek(week: WeekState): Partial<Record<ScheduleDay, string>> {
  const errors: Partial<Record<ScheduleDay, string>> = {};
  for (const day of SCHEDULE_DAYS) {
    const { enabled, windows } = week[day];
    if (!enabled) continue;
    if (windows.length === 0) {
      errors[day] = "Adicione ao menos uma janela.";
      continue;
    }
    if (windows.some((w) => !w.start || !w.end)) {
      errors[day] = "Preencha início e fim de todas as janelas.";
      continue;
    }
    if (windows.some((w) => minutes(w.start) >= minutes(w.end))) {
      errors[day] = "O fim deve ser depois do início.";
      continue;
    }
    const sorted = [...windows].sort((a, b) => minutes(a.start) - minutes(b.start));
    const overlaps = sorted.some((w, i) => i > 0 && minutes(w.start) < minutes(sorted[i - 1].end));
    if (overlaps) errors[day] = "As janelas não podem se sobrepor.";
  }
  return errors;
}

/**
 * Achata o editor no payload da API: cada janela de cada dia ativado, ordenadas
 * por dia e depois por horário de início. Dias desativados não contribuem com
 * nada, que é como a API representa "não trabalha nesse dia".
 */
export function toScheduleRequest(week: WeekState, intervalMinutes: number): UpdateScheduleRequest {
  const windows: ScheduleWindowRequest[] = [];
  for (const day of SCHEDULE_DAYS) {
    if (!week[day].enabled) continue;
    const sorted = [...week[day].windows].sort((a, b) => minutes(a.start) - minutes(b.start));
    for (const w of sorted) {
      windows.push({
        dayOfWeek: API_DAY_OF_WEEK[day],
        startTime: `${w.start}:00`,
        endTime: `${w.end}:00`,
      });
    }
  }
  return { windows, intervalBetweenAppointments: intervalMinutes };
}

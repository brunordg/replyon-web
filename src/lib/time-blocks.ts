// Presentation helpers for the Bloqueios screen.
//
// The backend stores one TimeBlock per professional, so "bloquear para todos"
// produces N sibling records. Everything here is about reading those N back as
// the single block the user thinks they created.

import type { TimeBlockResponse } from "./api/types";

export const BLOCK_TYPES = [
  { value: "LUNCH_BREAK", label: "Pausa / Almoço" },
  { value: "VACATION", label: "Férias" },
  { value: "DAY_OFF", label: "Folga" },
  { value: "SICK_LEAVE", label: "Atestado" },
  { value: "OTHER", label: "Outro" },
] as const;

export const RECURRENCE_PATTERNS = [
  { value: "DAILY", label: "Todos os dias" },
  { value: "WEEKLY", label: "Toda semana" },
  { value: "MONTHLY", label: "Todo mês" },
  { value: "YEARLY", label: "Todo ano" },
] as const;

export function blockTypeLabel(type: string): string {
  return BLOCK_TYPES.find((t) => t.value === type)?.label ?? type;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/**
 * How often the block repeats, phrased from the anchor date.
 *
 * WEEKLY repeats on the *same weekday* as the first occurrence — it is not a
 * Mon–Fri range — so the label names the day instead of implying a span.
 */
export function recurrenceLabel(block: TimeBlockResponse): string {
  if (!block.isRecurring || !block.recurrencePattern || block.recurrencePattern === "NONE") {
    return "Único";
  }
  const start = new Date(block.startDateTime);
  switch (block.recurrencePattern) {
    case "DAILY":
      return "Todos os dias";
    case "WEEKLY":
      return `Toda ${WEEKDAYS[start.getDay()]}`;
    case "MONTHLY":
      return `Todo dia ${start.getDate()}`;
    case "YEARLY":
      return `Todo ano em ${start.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
    default:
      return "Recorrente";
  }
}

/** Midnight to midnight is how a whole-day block is stored. */
export function isAllDay(start: string, end: string): boolean {
  return start.slice(11, 16) === "00:00" && end.slice(11, 16) === "00:00";
}

export function timeRangeLabel(start: string, end: string): string {
  if (isAllDay(start, end)) return "Dia inteiro";
  return `${start.slice(11, 16)} – ${end.slice(11, 16)}`;
}

export interface BlockGroup {
  /** Stable across renders: identical content always yields the same key. */
  key: string;
  /** The first sibling — every field except `staffId` is shared. */
  sample: TimeBlockResponse;
  /** Every record behind this card; edits and removals apply to all of them. */
  members: TimeBlockResponse[];
  staffIds: number[];
}

/**
 * Collapses sibling records into one card per logical block.
 *
 * Grouping is by content, not by a shared id — nothing links the siblings in the
 * database. The consequence is honest: two blocks created separately but with
 * identical type, window, reason and recurrence are indistinguishable, so they
 * merge. That matches how they read on the agenda anyway.
 *
 * Cancelled blocks are dropped: they no longer affect availability, so showing
 * them would invite the user to "remove" something already inert.
 */
export function groupBlocks(blocks: TimeBlockResponse[]): BlockGroup[] {
  const groups = new Map<string, BlockGroup>();

  for (const block of blocks) {
    if (block.status === "CANCELLED") continue;
    const key = [
      block.type,
      block.startDateTime,
      block.endDateTime,
      block.reason ?? "",
      block.isRecurring ? (block.recurrencePattern ?? "NONE") : "NONE",
    ].join("|");

    const existing = groups.get(key);
    if (existing) {
      existing.members.push(block);
      existing.staffIds.push(block.staffId);
    } else {
      groups.set(key, { key, sample: block, members: [block], staffIds: [block.staffId] });
    }
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.sample.startDateTime.localeCompare(b.sample.startDateTime) || a.key.localeCompare(b.key),
  );
}

/** "Todos" only when the group really covers every active professional. */
export function staffLabel(group: BlockGroup, names: Map<number, string>, total: number): string {
  if (total > 0 && group.staffIds.length >= total) return "Todos";
  if (group.staffIds.length === 1) {
    return names.get(group.staffIds[0]) ?? `Profissional #${group.staffIds[0]}`;
  }
  return `${group.staffIds.length} profissionais`;
}

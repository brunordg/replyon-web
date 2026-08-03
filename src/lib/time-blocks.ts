// Auxiliares de apresentação para a tela de Bloqueios.
//
// O backend armazena um TimeBlock por profissional, então "bloquear para todos"
// gera N registros irmãos. Tudo aqui trata de ler esses N registros de volta
// como o bloco único que o usuário acha que criou.

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
 * Com que frequência o bloco se repete, formulado a partir da data âncora.
 *
 * WEEKLY se repete no *mesmo dia da semana* da primeira ocorrência — não é um
 * intervalo de segunda a sexta — então o rótulo nomeia o dia em vez de sugerir
 * um período.
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

/** De meia-noite a meia-noite é como um bloco de dia inteiro é armazenado. */
export function isAllDay(start: string, end: string): boolean {
  return start.slice(11, 16) === "00:00" && end.slice(11, 16) === "00:00";
}

export function timeRangeLabel(start: string, end: string): string {
  if (isAllDay(start, end)) return "Dia inteiro";
  return `${start.slice(11, 16)} – ${end.slice(11, 16)}`;
}

export interface BlockGroup {
  /** Estável entre renderizações: conteúdo idêntico sempre gera a mesma chave. */
  key: string;
  /** O primeiro irmão — todos os campos exceto `staffId` são compartilhados. */
  sample: TimeBlockResponse;
  /** Todos os registros por trás deste card; edições e remoções se aplicam a todos eles. */
  members: TimeBlockResponse[];
  staffIds: number[];
}

/**
 * Colapsa registros irmãos em um card por bloco lógico.
 *
 * O agrupamento é por conteúdo, não por um id compartilhado — nada liga os
 * irmãos no banco de dados. A consequência é honesta: dois blocos criados
 * separadamente mas com tipo, janela, motivo e recorrência idênticos são
 * indistinguíveis, então se fundem. Isso condiz com a forma como aparecem na
 * agenda de qualquer forma.
 *
 * Blocos cancelados são descartados: eles não afetam mais a disponibilidade,
 * então exibi-los convidaria o usuário a "remover" algo já inerte.
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

/** "Todos" apenas quando o grupo realmente cobre todos os profissionais ativos. */
export function staffLabel(group: BlockGroup, names: Map<number, string>, total: number): string {
  if (total > 0 && group.staffIds.length >= total) return "Todos";
  if (group.staffIds.length === 1) {
    return names.get(group.staffIds[0]) ?? `Profissional #${group.staffIds[0]}`;
  }
  return `${group.staffIds.length} profissionais`;
}

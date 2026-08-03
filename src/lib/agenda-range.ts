// Lógica de intervalo de datas para as visões Dia / Semana / Mês da agenda.
//
// Pura e sempre em horário local: o intervalo exibido, como as setas se movem e
// o rótulo do cabeçalho derivam de uma data âncora mais a visão ativa. Nada aqui
// mexe em regras de negócio — apenas decide quais dias aparecem na tela.

export type AgendaView = "dia" | "semana" | "mes";

export const DOW_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Baseado em segunda-feira, seguindo o calendário pt-BR. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

/** Ancora no dia 1 antes de deslocar: 31 de jan + 1 mês deve ser fevereiro, não março. */
export function addMonths(d: Date, months: number): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "2026-07-18" em horário local — nunca via toISOString(), que converte para UTC. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Os dias exibidos na tela para uma visão.
 *
 * - dia: apenas a data âncora
 * - semana: segunda a sábado (6 colunas; domingo não é dia útil aqui)
 * - mes: semanas inteiras cobrindo o mês, para que a grade do calendário seja
 *   sempre retangular — dias no início/fim pertencem aos meses vizinhos
 */
export function daysFor(view: AgendaView, anchor: Date): Date[] {
  if (view === "dia") return [startOfDay(anchor)];
  if (view === "semana") {
    const monday = startOfWeek(anchor);
    return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  }
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const last = addDays(addMonths(first, 1), -1);
  const gridEnd = addDays(startOfWeek(last), 6);
  const out: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Move um passo do tamanho da visão: um dia, uma semana, um mês. */
export function shift(view: AgendaView, anchor: Date, direction: 1 | -1): Date {
  if (view === "dia") return addDays(anchor, direction);
  if (view === "semana") return addDays(anchor, 7 * direction);
  return addMonths(anchor, direction);
}

/** Rótulo do cabeçalho: "18 de julho, 2026" / "13 – 18 de julho, 2026" / "Julho 2026". */
export function rangeLabel(view: AgendaView, anchor: Date): string {
  if (view === "dia") {
    return startOfDay(anchor).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "mes") {
    const label = startOfMonth(anchor).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const days = daysFor("semana", anchor);
  const first = days[0];
  const last = days[days.length - 1];
  // Uma semana pode atravessar dois meses — cita os dois em vez de sugerir apenas um.
  if (first.getMonth() !== last.getMonth()) {
    const f = first.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    const l = last.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    return `${f} – ${l}, ${last.getFullYear()}`;
  }
  const month = first.toLocaleDateString("pt-BR", { month: "long" });
  return `${first.getDate()} – ${last.getDate()} de ${month}, ${first.getFullYear()}`;
}

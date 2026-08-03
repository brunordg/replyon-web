import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Cor de avatar determinística derivada de uma seed (nome/id), seguindo a paleta do app. */
const AVATAR_COLORS = [
  "#2748D9", "#18A05E", "#6B46C1", "#D98A0B",
  "#D8442E", "#0E7490", "#16277E", "#BE185D",
];
export function colorFromString(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** As primeiras até 2 iniciais de um nome completo. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Formatação de moeda brasileira para um preço numérico (BigDecimal na API). */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Converte uma string de preço pt-BR / en em um número.
 * "99,90" -> 99.9 | "1.234,56" -> 1234.56 | "99.90" -> 99.9 | "9990" -> 9990
 * Retorna NaN para entrada vazia/inválida.
 */
export function parsePrice(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s);
}

/** "17/07/2026" a partir de uma string ISO de data/datetime; "—" quando ausente/inválida. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

/** "17/07/2026 · 09:00" a partir de uma string ISO de datetime. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} · ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

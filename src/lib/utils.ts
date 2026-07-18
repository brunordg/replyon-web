import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic avatar color derived from a seed (name/id), matching the app palette. */
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

/** First up-to-2 initials from a full name. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Brazilian currency formatting for a numeric price (BigDecimal on the wire). */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Parses a pt-BR / en price string into a number.
 * "99,90" -> 99.9 | "1.234,56" -> 1234.56 | "99.90" -> 99.9 | "9990" -> 9990
 * Returns NaN for empty/invalid input.
 */
export function parsePrice(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s);
}

/** "17/07/2026" from an ISO date/datetime string; "—" when absent/invalid. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

/** "17/07/2026 · 09:00" from an ISO datetime string. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} · ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

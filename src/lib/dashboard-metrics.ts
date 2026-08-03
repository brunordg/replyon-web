// Auxiliares de apresentação para os cards de KPI do dashboard.
//
// As métricas em si — limites do período, quais status contam e as comparações
// com o período anterior — são calculadas pela API (GET /v1/dashboard/metrics).
// Nada aqui decide uma regra de negócio; essas funções apenas transformam um
// número que o servidor já produziu em um rótulo.

export type TrendDirection = "up" | "down" | "flat";

/** Um delta nulo significa que a API não tinha uma base de comparação. */
export function directionOf(delta: number | null | undefined): TrendDirection {
  if (delta === null || delta === undefined || Math.abs(delta) < 0.05) return "flat";
  return delta > 0 ? "up" : "down";
}

/** "+12%" / "−8%" / "—" quando não há base de comparação. */
export function formatPercentDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  const rounded = Math.round(delta);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}

/** Delta em pontos percentuais — taxas se comparam em p.p., nunca em porcentagem. */
export function formatPointsDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "0 p.p.";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)} p.p.`;
}

/** "2 a menos" / "3 a mais" / "igual" — diferença absoluta lê melhor que % para contagens. */
export function formatCountDelta(value: number, previous: number): string {
  const diff = value - previous;
  if (diff === 0) return "igual";
  return `${Math.abs(diff)} a ${diff > 0 ? "mais" : "menos"}`;
}

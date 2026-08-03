// Posicionamento lado a lado para agendamentos que compartilham um intervalo de tempo.
//
// Sem isso, dois agendamentos no mesmo horário são posicionados de forma absoluta
// um sobre o outro e apenas o último desenhado fica visível — a agenda esconde
// trabalho silenciosamente. Eventos sobrepostos são divididos em faixas (lanes)
// para que todos permaneçam legíveis.

export interface Spannable {
  /** Início em horas a partir da meia-noite, ex.: 14.5 para 14:30. */
  start: number;
  /** Duração em horas. */
  durationHours: number;
}

export interface Lane {
  /** Índice da coluna (0-based) dentro do cluster de sobreposição. */
  index: number;
  /** Quantas faixas o cluster precisa — o divisor da largura. */
  of: number;
}

/**
 * Atribui a cada item uma faixa dentro do seu cluster de itens sobrepostos.
 *
 * Os clusters são formados transitivamente: A sobrepondo B e B sobrepondo C coloca
 * os três em um único cluster, para que compartilhem a mesma largura mesmo quando
 * A e C não se tocam. Isso mantém as colunas alinhadas em vez de os itens mudarem
 * de largura no meio do cluster.
 *
 * Tocar não é sobrepor — um agendamento que termina às 16:00 e outro que começa
 * às 16:00 ficam na mesma faixa, seguindo a regra de intervalo semiaberto do backend.
 */
export function assignLanes<T extends Spannable>(items: T[]): Map<T, Lane> {
  const result = new Map<T, Lane>();
  if (items.length === 0) return result;

  const sorted = [...items].sort((a, b) => a.start - b.start || a.durationHours - b.durationHours);

  let cluster: T[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    // Guloso: reaproveita a primeira faixa já livre no início deste item.
    const laneEnds: number[] = [];
    const laneOf = new Map<T, number>();
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = item.start + item.durationHours;
      laneOf.set(item, lane);
    }
    for (const item of cluster) {
      result.set(item, { index: laneOf.get(item) ?? 0, of: laneEnds.length });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    // Um intervalo (start >= clusterEnd) fecha o cluster: nada depois dele pode
    // se sobrepor a algo anterior, já que a lista está ordenada por início.
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.start + item.durationHours);
  }
  flush();

  return result;
}

/** Percentual left/width para uma faixa, deixando um pequeno espaçamento entre vizinhas. */
export function laneStyle(lane: Lane | undefined): { left: string; width: string } {
  if (!lane || lane.of <= 1) return { left: "0%", width: "100%" };
  const width = 100 / lane.of;
  return { left: `${lane.index * width}%`, width: `${width}%` };
}

/**
 * Além de três faixas, um bloco fica com menos de ~50px de largura — mais estreito
 * que um nome truncado — então dividir ainda mais troca um agendamento escondido
 * por vários ilegíveis. O restante é exibido através de um recurso "+N mais".
 */
export const MAX_LANES = 3;

/** Cinco colunas de 180px mais o espaçamento de 56px cabem sem rolagem horizontal. */
export const MAX_DAY_COLUMNS = 5;

export interface LaneLayout<T> {
  /** Apenas os itens que cabem; `of` é limitado para que ainda preencham a coluna. */
  lanes: Map<T, Lane>;
  /** Itens que ultrapassaram o limite, em ordem de início. */
  hidden: T[];
}

/**
 * Atribuição de faixas com um teto.
 *
 * Reaproveita deliberadamente `assignLanes` em vez de rodar o empacotador novamente
 * com um orçamento menor: isso mantém uma única fonte de verdade para a ordem das
 * faixas e torna determinístico *qual* item é descartado — o empacotador guloso
 * atribui índices altos aos que chegam por último, então o agendamento com início
 * mais tardio é o que fica escondido.
 */
export function layoutLanes<T extends Spannable>(
  items: T[],
  maxLanes: number = MAX_LANES,
): LaneLayout<T> {
  const full = assignLanes(items);
  const lanes = new Map<T, Lane>();
  const hidden: T[] = [];

  for (const [item, lane] of full) {
    if (lane.index >= maxLanes) {
      hidden.push(item);
      continue;
    }
    // Reajusta `of`: um cluster de 5 faixas renderizado em 3 deixaria 40% de espaço morto.
    lanes.set(item, { index: lane.index, of: Math.min(lane.of, maxLanes) });
  }

  hidden.sort((a, b) => a.start - b.start);
  return { lanes, hidden };
}

/** Agrupa itens escondidos pela hora de início, para que o chip "+N" caia na célula certa. */
export function overflowByHour<T extends Spannable>(hidden: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of hidden) {
    const hour = Math.floor(item.start);
    const list = map.get(hour);
    if (list) list.push(item);
    else map.set(hour, [item]);
  }
  return map;
}

/**
 * Quais profissionais viram colunas na visão Dia.
 *
 * Uma seleção explícita sempre prevalece. Sem ela, os profissionais ocupados são
 * exibidos — mas em um dia sem nenhum agendamento caímos nos primeiros
 * profissionais ativos em vez de uma tela vazia, porque uma coluna vazia é
 * justamente o recurso para identificar um horário livre para agendar.
 */
export function pickDayColumns<T extends { id: number }>(
  staff: T[],
  hasEvents: (id: number) => boolean,
  selectedIds: number[],
  max: number = MAX_DAY_COLUMNS,
): { visible: T[]; hiddenCount: number } {
  if (selectedIds.length > 0) {
    const selected = new Set(selectedIds);
    // Filtra `staff` em vez de mapear os ids, para que a ordem das colunas sempre
    // siga a lista de profissionais em vez da ordem em que as caixas foram marcadas.
    return { visible: staff.filter((s) => selected.has(s.id)).slice(0, max), hiddenCount: 0 };
  }

  const busy = staff.filter((s) => hasEvents(s.id));
  if (busy.length === 0) return { visible: staff.slice(0, max), hiddenCount: 0 };

  return { visible: busy.slice(0, max), hiddenCount: Math.max(0, busy.length - max) };
}

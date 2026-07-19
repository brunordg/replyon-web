// Side-by-side placement for appointments that share a time span.
//
// Without this, two bookings at the same hour are absolutely positioned on top
// of each other and only the last one painted is visible — the agenda silently
// hides work. Overlapping events are split into lanes so every one stays
// readable.

export interface Spannable {
  /** Start in hours from midnight, e.g. 14.5 for 14:30. */
  start: number;
  /** Length in hours. */
  durationHours: number;
}

export interface Lane {
  /** 0-based column index inside the overlap cluster. */
  index: number;
  /** How many lanes the cluster needs — the divisor for the width. */
  of: number;
}

/**
 * Assigns each item a lane within its cluster of overlapping items.
 *
 * Clusters are built transitively: A overlapping B and B overlapping C puts all
 * three in one cluster, so they share a width even when A and C do not touch.
 * That keeps columns aligned instead of items jumping width mid-cluster.
 *
 * Touching is not overlapping — an appointment ending at 16:00 and another
 * starting at 16:00 sit in the same lane, matching the backend's half-open
 * interval rule.
 */
export function assignLanes<T extends Spannable>(items: T[]): Map<T, Lane> {
  const result = new Map<T, Lane>();
  if (items.length === 0) return result;

  const sorted = [...items].sort((a, b) => a.start - b.start || a.durationHours - b.durationHours);

  let cluster: T[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    // Greedy: reuse the first lane already free at this item's start.
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
    // A gap (start >= clusterEnd) closes the cluster: nothing after it can
    // overlap anything before it, since the list is sorted by start.
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.start + item.durationHours);
  }
  flush();

  return result;
}

/** Percent left/width for a lane, leaving a small gutter between neighbours. */
export function laneStyle(lane: Lane | undefined): { left: string; width: string } {
  if (!lane || lane.of <= 1) return { left: "0%", width: "100%" };
  const width = 100 / lane.of;
  return { left: `${lane.index * width}%`, width: `${width}%` };
}

/**
 * Beyond three lanes a block is under ~50px wide — narrower than a truncated
 * name — so splitting further trades one hidden appointment for several
 * illegible ones. The rest is surfaced as a "+N mais" affordance instead.
 */
export const MAX_LANES = 3;

/** Five columns of 180px plus the 56px gutter fit without horizontal scrolling. */
export const MAX_DAY_COLUMNS = 5;

export interface LaneLayout<T> {
  /** Only the items that fit; `of` is clamped so they still fill the column. */
  lanes: Map<T, Lane>;
  /** Items pushed past the cap, in start order. */
  hidden: T[];
}

/**
 * Lane assignment with a ceiling.
 *
 * Deliberately reuses `assignLanes` rather than re-running the packer with a
 * smaller budget: that keeps a single source of truth for lane order, and makes
 * *which* item gets dropped deterministic — the greedy packer hands high indices
 * to late arrivals, so the latest-starting appointment is the one hidden.
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
    // Re-clamp `of`: a 5-lane cluster rendered at 3 would leave 40% dead space.
    lanes.set(item, { index: lane.index, of: Math.min(lane.of, maxLanes) });
  }

  hidden.sort((a, b) => a.start - b.start);
  return { lanes, hidden };
}

/** Groups hidden items by starting hour, so the "+N" chip lands in the right cell. */
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
 * Which professionals become columns in the Dia view.
 *
 * An explicit selection always wins. With none, the busy professionals are shown
 * — but on a day where nobody is booked we fall back to the first few active
 * staff rather than an empty screen, because an empty column is precisely the
 * affordance for spotting a free slot to book into.
 */
export function pickDayColumns<T extends { id: number }>(
  staff: T[],
  hasEvents: (id: number) => boolean,
  selectedIds: number[],
  max: number = MAX_DAY_COLUMNS,
): { visible: T[]; hiddenCount: number } {
  if (selectedIds.length > 0) {
    const selected = new Set(selectedIds);
    // Filter `staff` rather than mapping the ids, so column order always follows
    // the staff list instead of the order boxes happened to be ticked.
    return { visible: staff.filter((s) => selected.has(s.id)).slice(0, max), hiddenCount: 0 };
  }

  const busy = staff.filter((s) => hasEvents(s.id));
  if (busy.length === 0) return { visible: staff.slice(0, max), hiddenCount: 0 };

  return { visible: busy.slice(0, max), hiddenCount: Math.max(0, busy.length - max) };
}

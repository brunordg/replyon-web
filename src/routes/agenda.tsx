import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useCustomers } from "@/lib/api/hooks/customers";
import { useServices } from "@/lib/api/hooks/services";
import { useAllAppointmentsByStaff } from "@/lib/api/hooks/appointments";
import { useDashboardMetrics } from "@/lib/api/hooks/dashboard";
import { NovoAgendamentoDialog } from "@/components/novo-agendamento-dialog";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/api/status";
import { colorFromString, formatBRL, initials } from "@/lib/utils";
import {
  directionOf,
  formatCountDelta,
  formatPercentDelta,
  formatPointsDelta,
} from "@/lib/dashboard-metrics";
import {
  dateKey,
  daysFor,
  DOW_LABELS,
  rangeLabel,
  sameDay,
  shift,
  startOfDay,
  startOfMonth,
  type AgendaView,
} from "@/lib/agenda-range";
import {
  laneStyle,
  layoutLanes,
  MAX_DAY_COLUMNS,
  MAX_LANES,
  overflowByHour,
  pickDayColumns,
} from "@/lib/agenda-layout";
import type { StaffResponse } from "@/lib/api/types";
import type { AppointmentResponse, AppointmentStatus } from "@/lib/api/types";

export const Route = createFileRoute("/agenda")({
  component: AgendaPage,
  head: () => ({
    meta: [
      { title: "Agenda — Replyon" },
      {
        name: "description",
        content: "Acompanhe a semana da sua equipe e mantenha os horários sob controle.",
      },
    ],
  }),
});

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const CELL = 74;

type EvtCls = "ok" | "warn" | "done" | "danger";

const STATUS_CLS: Record<AppointmentStatus, EvtCls | null> = {
  CONFIRMED: "ok",
  PENDING: "warn",
  COMPLETED: "done",
  NO_SHOW: "danger",
  CANCELLED: null, // never occupies the grid
};

const evtStyles: Record<EvtCls, string> = {
  ok: "bg-ok-bg border-ok text-[#0E5E38]",
  warn: "bg-warn-bg border-warn text-[#7A4E06]",
  done: "bg-done-bg border-done text-[#44277E]",
  danger: "bg-danger-bg border-danger text-[#8A2617]",
};

const dotStyles: Record<EvtCls, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  done: "bg-done",
  danger: "bg-danger",
};

const FILTER_STATUSES: AppointmentStatus[] = [
  "CONFIRMED",
  "PENDING",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

/** Radix reserves "" for the placeholder, so "all" needs its own sentinel. */
const ALL = "__all__";

interface Evt {
  id: number;
  staffId: number;
  day: string;
  start: number;
  durationHours: number;
  cls: EvtCls;
  customer: string;
  detail: string;
  startLabel: string;
  endLabel: string;
}

function hourLabel(iso: string): string {
  return iso.slice(11, 16);
}

function AgendaPage() {
  const [view, setView] = useState<AgendaView>("semana");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [selectedStaff, setSelectedStaff] = useState<Set<number>>(() => new Set());
  const [serviceFilter, setServiceFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const staffQuery = useStaffList({ size: 200 });
  const customersQuery = useCustomers({ size: 200 });
  const servicesQuery = useServices({ size: 200 });
  const staff = useMemo(() => staffQuery.data?.content ?? [], [staffQuery.data]);
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const { appointments } = useAllAppointmentsByStaff(staffIds);
  const metrics = useDashboardMetrics().data;

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const customerMap = useMemo(
    () => new Map((customersQuery.data?.content ?? []).map((c) => [c.id, c])),
    [customersQuery.data],
  );
  const services = useMemo(() => servicesQuery.data?.content ?? [], [servicesQuery.data]);
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const days = useMemo(() => daysFor(view, anchor), [view, anchor]);
  const dayKeys = useMemo(() => days.map(dateKey), [days]);
  const today = startOfDay(new Date());

  const hasFilters = selectedStaff.size > 0 || serviceFilter !== ALL || statusFilter !== ALL;

  function clearFilters() {
    setSelectedStaff(new Set());
    setServiceFilter(ALL);
    setStatusFilter(ALL);
  }

  /** Filters apply before the grid so the count and the cells always agree. */
  const visible = useMemo(() => {
    const inRange = new Set(dayKeys);
    return appointments.filter((a: AppointmentResponse) => {
      if (!inRange.has(a.appointmentDateTime.slice(0, 10))) return false;
      if (selectedStaff.size > 0 && !selectedStaff.has(a.staffId)) return false;
      if (serviceFilter !== ALL && String(a.serviceId) !== serviceFilter) return false;
      // Cancelled is hidden unless explicitly asked for — it occupies no time.
      if (statusFilter === ALL) return a.status !== "CANCELLED";
      return a.status === statusFilter;
    });
  }, [appointments, dayKeys, selectedStaff, serviceFilter, statusFilter]);

  const events = useMemo<Evt[]>(
    () =>
      visible.flatMap((a) => {
        const cls = STATUS_CLS[a.status];
        if (!cls) return [];
        const hh = Number(a.appointmentDateTime.slice(11, 13));
        const mm = Number(a.appointmentDateTime.slice(14, 16));
        const service = serviceMap.get(a.serviceId);
        // Prefer the appointment's own end — it is authoritative even if the
        // service duration changed after the booking.
        const startMs = new Date(a.appointmentDateTime).getTime();
        const endMs = new Date(a.endDateTime).getTime();
        const durationHours =
          endMs > startMs
            ? (endMs - startMs) / 3_600_000
            : Math.max(0.5, (service?.durationMinutes ?? 60) / 60);
        return [
          {
            id: a.id,
            staffId: a.staffId,
            day: a.appointmentDateTime.slice(0, 10),
            start: hh + mm / 60,
            durationHours,
            cls,
            customer: customerMap.get(a.customerId)?.name ?? `Cliente #${a.customerId}`,
            detail: `${service?.name ?? "Serviço"} · ${staffMap.get(a.staffId)?.name ?? ""}`.trim(),
            startLabel: hourLabel(a.appointmentDateTime),
            endLabel: hourLabel(a.endDateTime),
          },
        ];
      }),
    [visible, serviceMap, customerMap, staffMap],
  );

  const kpis = [
    {
      label: "Agendamentos hoje",
      value: metrics ? String(metrics.appointmentsToday.value) : "—",
      delta: formatPercentDelta(metrics?.appointmentsToday.changePercent),
      direction: directionOf(metrics?.appointmentsToday.changePercent),
      caption: "vs. mesmo dia da semana passada",
    },
    {
      label: "Taxa de ocupação",
      value: metrics?.occupancy.rate == null ? "—" : `${Math.round(metrics.occupancy.rate)}%`,
      delta: formatPointsDelta(metrics?.occupancy.changePoints),
      direction: directionOf(metrics?.occupancy.changePoints),
      caption: "vs. semana passada",
    },
    {
      label: "Faturamento previsto",
      value: metrics ? formatBRL(metrics.expectedRevenue.month) : "—",
      delta: formatPercentDelta(metrics?.expectedRevenue.changePercent),
      direction: directionOf(metrics?.expectedRevenue.changePercent),
      caption: "no mês",
    },
    {
      label: "Faltas no mês",
      value: metrics ? String(metrics.noShowsMonth.value) : "—",
      delta: metrics
        ? formatCountDelta(metrics.noShowsMonth.value, metrics.noShowsMonth.previous)
        : "—",
      // Fewer no-shows is good news, so the colour is inverted on purpose.
      direction: !metrics
        ? ("flat" as const)
        : metrics.noShowsMonth.value < metrics.noShowsMonth.previous
          ? ("up" as const)
          : metrics.noShowsMonth.value > metrics.noShowsMonth.previous
            ? ("down" as const)
            : ("flat" as const),
      caption: "que o mês passado",
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Agenda"]}
        title="Agenda"
        subtitle="Acompanhe a semana da sua equipe e mantenha os horários sob controle"
        actions={
          <>
            <Button variant="outline" className="rounded-[10px] gap-2">
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
            <NovoAgendamentoDialog />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-[14px] border-ry-line p-4">
            <div className="text-[11px] tracking-[0.3px] text-ry-ink-soft">{k.label}</div>
            <div className="font-display text-[26px] font-medium mt-1">{k.value}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className={
                  k.direction === "up"
                    ? "font-medium text-ok"
                    : k.direction === "down"
                      ? "font-medium text-danger"
                      : "text-ry-ink-soft"
                }
              >
                {k.delta}
              </span>
              <span className="text-ry-ink-soft">{k.caption}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[14px] border-ry-line overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3.5 border-b border-ry-line px-4 py-3.5">
          <div className="flex gap-1.5">
            <NavButton label="Anterior" onClick={() => setAnchor((a) => shift(view, a, -1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </NavButton>
            <NavButton label="Hoje" onClick={() => setAnchor(startOfDay(new Date()))}>
              Hoje
            </NavButton>
            <NavButton label="Próximo" onClick={() => setAnchor((a) => shift(view, a, 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </NavButton>
          </div>
          <span className="font-display text-[17px] font-medium uppercase tracking-wider">
            {rangeLabel(view, anchor)}
          </span>
          <div className="ml-auto flex overflow-hidden rounded-[9px] border border-ry-line">
            {(
              [
                ["dia", "Dia"],
                ["semana", "Semana"],
                ["mes", "Mês"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={`px-4 py-2 text-[11.5px] transition ${
                  view === key
                    ? "bg-ry-blue-600 text-white font-medium"
                    : "bg-white text-ry-ink-soft hover:text-ry-blue-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-b border-ry-line bg-ry-blue-50 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ry-ink-soft">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </span>

          <StaffFilter staff={staff} selected={selectedStaff} onChange={setSelectedStaff} />
          <FilterSelect
            value={serviceFilter}
            onChange={setServiceFilter}
            allLabel="Todos serviços"
            options={services.map((s) => ({ value: String(s.id), label: s.name }))}
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="Todos status"
            options={FILTER_STATUSES.map((s) => ({
              value: s,
              label: APPOINTMENT_STATUS_LABEL[s],
            }))}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] text-ry-ink-soft transition hover:text-ry-blue-600"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          )}

          <span className="ml-auto text-[11px] text-ry-blue-600">
            {events.length} {events.length === 1 ? "agendamento" : "agendamentos"}
          </span>
        </div>

        {view === "mes" ? (
          <MonthGrid days={days} anchor={anchor} today={today} events={events} />
        ) : view === "dia" ? (
          <DayGrid day={days[0]} staff={staff} selectedStaff={selectedStaff} events={events} />
        ) : (
          <TimeGrid
            days={days}
            today={today}
            events={events}
            onDrillDown={(day) => {
              setAnchor(startOfDay(day));
              setView("dia");
            }}
          />
        )}
      </Card>
    </>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-lg border border-ry-line bg-white px-3 py-1.5 text-[11.5px] transition hover:border-ry-blue-500 hover:text-ry-blue-600"
    >
      {children}
    </button>
  );
}

/**
 * Multi-select for professionals, capped at MAX_DAY_COLUMNS because that is how
 * many columns the Dia view can show legibly. An empty selection means "decide
 * for me" — the Dia view then falls back to whoever is booked that day.
 */
function StaffFilter({
  staff,
  selected,
  onChange,
}: {
  staff: StaffResponse[];
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
}) {
  const atLimit = selected.size >= MAX_DAY_COLUMNS;

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_DAY_COLUMNS) next.add(id);
    onChange(next);
  }

  const label =
    selected.size === 0
      ? "Todos profissionais"
      : selected.size === 1
        ? (staff.find((s) => selected.has(s.id))?.name ?? "1 selecionado")
        : `${selected.size} selecionados`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-8 min-w-[150px] items-center justify-between gap-2 rounded-lg border border-ry-line bg-white px-3 text-[11.5px] transition hover:border-ry-blue-500">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuLabel className="text-[11px] font-normal text-ry-ink-soft">
          Até {MAX_DAY_COLUMNS} profissionais na visão Dia
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {staff.length === 0 ? (
          <div className="px-2 py-1.5 text-[11.5px] text-ry-ink-soft">
            Nenhum profissional ativo.
          </div>
        ) : (
          staff.map((s) => {
            const checked = selected.has(s.id);
            return (
              <DropdownMenuCheckboxItem
                key={s.id}
                checked={checked}
                // Blocking the unchecked ones at the cap makes the limit obvious
                // without silently dropping a pick the user just made.
                disabled={!checked && atLimit}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggle(s.id)}
                className="text-[12px]"
              >
                {s.name}
              </DropdownMenuCheckboxItem>
            );
          })
        )}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              onClick={() => onChange(new Set())}
              className="w-full px-2 py-1.5 text-left text-[11.5px] text-ry-ink-soft transition hover:text-ry-blue-600"
            >
              Limpar seleção
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[150px] rounded-lg bg-white text-[11.5px]">
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Hour-by-hour columns, one per day — the Semana view. */
function TimeGrid({
  days,
  today,
  events,
  onDrillDown,
}: {
  days: Date[];
  today: Date;
  events: Evt[];
  onDrillDown: (day: Date) => void;
}) {
  // Two professionals booked at the same hour must sit side by side; stacking
  // them absolutely would hide all but one. Past MAX_LANES the blocks would be
  // too thin to read, so the remainder becomes a "+N mais" chip.
  const layoutByDay = useMemo(() => {
    const byDay = new Map<string, Evt[]>();
    for (const e of events) {
      const list = byDay.get(e.day);
      if (list) list.push(e);
      else byDay.set(e.day, [e]);
    }
    return new Map(
      [...byDay].map(([day, evts]) => {
        const { lanes, hidden } = layoutLanes(evts, MAX_LANES);
        return [day, { lanes, overflow: overflowByHour(hidden) }];
      }),
    );
  }, [events]);

  return (
    <div className="overflow-x-auto">
      <div
        className={days.length === 1 ? "grid min-w-[420px]" : "grid min-w-[860px]"}
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div className="sticky left-0 z-[6] border-r border-ry-line bg-white border-b" />
        {days.map((day) => (
          <div
            key={dateKey(day)}
            className="border-b border-l border-ry-line bg-white py-2.5 text-center"
          >
            <div className="font-display text-[10.5px] tracking-[1.5px] uppercase text-ry-ink-soft">
              {DOW_LABELS[(day.getDay() + 6) % 7]}
            </div>
            <div
              className={
                sameDay(day, today)
                  ? "mt-0.5 inline-block rounded-[9px] bg-ry-blue-600 px-2 py-[1px] text-[15px] font-semibold text-white"
                  : "mt-0.5 text-[15px] font-semibold"
              }
            >
              {day.getDate()}
            </div>
          </div>
        ))}

        {HOURS.map((h) => (
          <div key={h} className="contents">
            <div
              className="sticky left-0 z-[6] border-r border-ry-line bg-white border-b pr-2 pt-1 text-right text-[10px] text-ry-ink-soft"
              style={{ height: CELL }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
            {days.map((day) => {
              const key = dateKey(day);
              const cellEvents = events.filter((e) => e.day === key && Math.floor(e.start) === h);
              // Lanes are computed over the whole day, not this cell, so an
              // event starting at 14:30 shares a width with one starting at 14:00.
              const layout = layoutByDay.get(key);
              const hiddenHere = layout?.overflow.get(h) ?? [];
              return (
                <div
                  key={`${key}-${h}`}
                  className="relative border-b border-l border-ry-line bg-white"
                  style={{ height: CELL }}
                >
                  {cellEvents.map((e) => (
                    <EventBlock key={e.id} evt={e} lane={layout?.lanes.get(e)} />
                  ))}
                  {hiddenHere.length > 0 && (
                    <OverflowChip
                      hidden={hiddenHere}
                      // The Dia view splits by professional, which is exactly
                      // what resolves this overlap — a drill-down, not a dead end.
                      onClick={() => onDrillDown(day)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stands in for appointments dropped past MAX_LANES. Mirrors the "+N mais" chip
 * MonthGrid already uses. Interactive when there is somewhere to drill into.
 */
function OverflowChip({ hidden, onClick }: { hidden: Evt[]; onClick?: () => void }) {
  const title = hidden.map((e) => `${e.startLabel} · ${e.customer} · ${e.detail}`).join("\n");
  const className =
    "absolute bottom-1 right-1 z-[4] rounded-[6px] bg-ry-blue-50 px-1.5 py-[1px] text-[10px] font-medium text-ry-blue-600";
  if (!onClick) {
    return (
      <span title={title} className={className}>
        +{hidden.length}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${className} hover:bg-ry-blue-100`}
    >
      +{hidden.length} mais
    </button>
  );
}

/** One appointment on the time grid, narrowed to its lane when it overlaps another. */
function EventBlock({ evt, lane }: { evt: Evt; lane?: { index: number; of: number } }) {
  const { left, width } = laneStyle(lane);
  // Detail is dropped in steps as the block narrows: at 3 lanes it is ~63px,
  // where even "14:00 – 15:00" no longer fits. The title keeps the full text.
  const of = lane?.of ?? 1;
  return (
    <div
      title={`${evt.startLabel} – ${evt.endLabel} · ${evt.customer} · ${evt.detail}`}
      className={`absolute z-[2] cursor-pointer overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-[10px] leading-[1.35] transition-transform hover:-translate-y-[1px] hover:shadow-[0_6px_14px_rgba(29,36,51,.14)] hover:z-[5] ${evtStyles[evt.cls]}`}
      style={{
        top: (evt.start - Math.floor(evt.start)) * CELL + 2,
        height: evt.durationHours * CELL - 6,
        left: `calc(${left} + 4px)`,
        width: `calc(${width} - 8px)`,
      }}
    >
      <b className="block truncate text-[10.5px] font-semibold">{evt.customer}</b>
      <small className="block truncate opacity-80">
        {of === 1
          ? `${evt.startLabel} – ${evt.endLabel} · ${evt.detail}`
          : of === 2
            ? `${evt.startLabel} – ${evt.endLabel}`
            : evt.startLabel}
      </small>
    </div>
  );
}

/**
 * The Dia view: one column per professional, so simultaneous appointments run
 * in parallel instead of overlapping. Lanes still apply inside a column as a
 * safety net for same-professional overlaps.
 */
function DayGrid({
  day,
  staff,
  selectedStaff,
  events,
}: {
  day: Date;
  staff: StaffResponse[];
  selectedStaff: Set<number>;
  events: Evt[];
}) {
  const key = dateKey(day);
  const dayEvents = useMemo(() => events.filter((e) => e.day === key), [events, key]);

  const byStaff = useMemo(() => {
    const map = new Map<number, Evt[]>();
    for (const e of dayEvents) {
      const list = map.get(e.staffId);
      if (list) list.push(e);
      else map.set(e.staffId, [e]);
    }
    return map;
  }, [dayEvents]);

  /**
   * Active staff plus anyone holding an appointment today who is no longer in
   * the list (a deactivated professional) — otherwise their bookings vanish.
   */
  const candidates = useMemo(() => {
    const known = new Set(staff.map((s) => s.id));
    const extras = [...byStaff.keys()]
      .filter((id) => !known.has(id))
      .map((id) => ({ id, name: `Profissional #${id}` }) as StaffResponse);
    return [...staff, ...extras];
  }, [staff, byStaff]);

  const { visible, hiddenCount } = useMemo(
    () =>
      pickDayColumns(candidates, (id) => (byStaff.get(id)?.length ?? 0) > 0, [...selectedStaff]),
    [candidates, byStaff, selectedStaff],
  );

  const columns = useMemo(
    () =>
      visible.map((s) => {
        const evts = byStaff.get(s.id) ?? [];
        const { lanes, hidden } = layoutLanes(evts, MAX_LANES);
        return {
          staffId: s.id,
          name: s.name,
          events: evts,
          lanes,
          overflow: overflowByHour(hidden),
        };
      }),
    [visible, byStaff],
  );

  if (columns.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[12px] text-ry-ink-soft">
        Nenhum profissional ativo para exibir.
      </div>
    );
  }

  return (
    <>
      {hiddenCount > 0 && (
        <p className="border-b border-ry-line bg-white px-4 py-2 text-[11px] text-ry-ink-soft">
          {hiddenCount} {hiddenCount === 1 ? "profissional" : "profissionais"} com agendamento
          {hiddenCount === 1 ? " não está" : " não estão"} sendo exibido
          {hiddenCount === 1 ? "" : "s"} — use o filtro para escolher quais ver.
        </p>
      )}
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `56px repeat(${columns.length}, minmax(180px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-[6] border-r border-ry-line bg-white border-b" />
          {columns.map((col) => (
            <div
              key={col.staffId}
              className="border-b border-l border-ry-line bg-white px-2 py-2.5 text-center"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
                  style={{ background: colorFromString(col.name) }}
                >
                  {initials(col.name)}
                </span>
                <span className="truncate text-[12px] font-medium">{col.name}</span>
              </div>
              <div className="mt-0.5 text-[10px] text-ry-ink-soft">
                {col.events.length} {col.events.length === 1 ? "atendimento" : "atendimentos"}
              </div>
            </div>
          ))}

          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div
                className="sticky left-0 z-[6] border-r border-ry-line bg-white border-b pr-2 pt-1 text-right text-[10px] text-ry-ink-soft"
                style={{ height: CELL }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
              {columns.map((col) => {
                const hiddenHere = col.overflow.get(h) ?? [];
                return (
                  <div
                    key={`${col.staffId}-${h}`}
                    className="relative border-b border-l border-ry-line bg-white"
                    style={{ height: CELL }}
                  >
                    {col.events
                      .filter((e) => Math.floor(e.start) === h)
                      .map((e) => (
                        <EventBlock key={e.id} evt={e} lane={col.lanes.get(e)} />
                      ))}
                    {/* Already split by professional — nowhere further to drill. */}
                    {hiddenHere.length > 0 && <OverflowChip hidden={hiddenHere} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Calendar cells with compact chips — the Mês view; an hour grid would not fit. */
function MonthGrid({
  days,
  anchor,
  today,
  events,
}: {
  days: Date[];
  anchor: Date;
  today: Date;
  events: Evt[];
}) {
  const currentMonth = startOfMonth(anchor).getMonth();
  const byDay = useMemo(() => {
    const map = new Map<string, Evt[]>();
    for (const e of events) {
      const list = map.get(e.day);
      if (list) list.push(e);
      else map.set(e.day, [e]);
    }
    for (const list of map.values()) list.sort((a, b) => a.start - b.start);
    return map;
  }, [events]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="border-b border-l border-ry-line bg-white py-2 text-center font-display text-[10.5px] uppercase tracking-[1.5px] text-ry-ink-soft first:border-l-0"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = byDay.get(key) ?? [];
          const outside = day.getMonth() !== currentMonth;
          return (
            <div
              key={key}
              className={`min-h-[110px] border-b border-l border-ry-line p-1.5 ${
                outside ? "bg-[#FAFBFE]" : "bg-white"
              }`}
            >
              <div
                className={
                  sameDay(day, today)
                    ? "mb-1 inline-block rounded-[7px] bg-ry-blue-600 px-1.5 text-[11px] font-semibold text-white"
                    : `mb-1 text-[11px] font-semibold ${outside ? "text-ry-ink-soft" : ""}`
                }
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    title={`${e.startLabel} – ${e.endLabel} · ${e.customer} · ${e.detail}`}
                    className="flex items-center gap-1 truncate text-[10px]"
                  >
                    <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles[e.cls]}`} />
                    <span className="text-ry-ink-soft">{e.startLabel}</span>
                    <span className="truncate">{e.customer}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-ry-ink-soft">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

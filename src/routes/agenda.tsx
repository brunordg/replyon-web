import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useMemo } from "react";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useCustomers } from "@/lib/api/hooks/customers";
import { useServices } from "@/lib/api/hooks/services";
import { useAllAppointmentsByStaff } from "@/lib/api/hooks/appointments";
import { formatBRL } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/api/types";

export const Route = createFileRoute("/agenda")({
  component: AgendaPage,
  head: () => ({
    meta: [
      { title: "Agenda — Replyon" },
      { name: "description", content: "Acompanhe a semana da sua equipe e mantenha os horários sob controle." },
    ],
  }),
});

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const CELL = 74;
const DOW_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type EvtCls = "ok" | "warn" | "info" | "done" | "danger" | "block";
type Evt = { d: number; h: number; dur: number; cls: EvtCls; t: string; s: string };

const STATUS_CLS: Record<AppointmentStatus, EvtCls | null> = {
  CONFIRMED: "ok",
  PENDING: "warn",
  COMPLETED: "done",
  NO_SHOW: "danger",
  CANCELLED: null, // hidden from the grid
};

const evtStyles: Record<EvtCls, string> = {
  ok: "bg-ok-bg border-ok text-[#0E5E38]",
  warn: "bg-warn-bg border-warn text-[#7A4E06]",
  info: "bg-info-bg border-info text-[#1B308F]",
  done: "bg-done-bg border-done text-[#44277E]",
  danger: "bg-danger-bg border-danger text-[#8A2617]",
  block: "border-[#9AA3B5] text-ry-ink-soft",
};

function fmtHour(h: number) {
  const hi = Math.floor(h);
  return String(hi).padStart(2, "0") + ":" + (h % 1 ? "30" : "00");
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function AgendaPage() {
  const staffQuery = useStaffList({ size: 200 });
  const customersQuery = useCustomers({ size: 200 });
  const servicesQuery = useServices({ size: 200 });
  const staff = staffQuery.data?.content ?? [];
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const { appointments } = useAllAppointmentsByStaff(staffIds);

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const customerMap = useMemo(
    () => new Map((customersQuery.data?.content ?? []).map((c) => [c.id, c])),
    [customersQuery.data],
  );
  const serviceMap = useMemo(
    () => new Map((servicesQuery.data?.content ?? []).map((s) => [s.id, s])),
    [servicesQuery.data],
  );

  // Current week, Monday..Saturday.
  const { days, dayKeys, rangeLabel } = useMemo(() => {
    const now = new Date();
    const offset = (now.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - offset);
    const todayK = dateKey(now);
    const ds = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { dow: DOW_LABELS[i], d: d.getDate(), today: dateKey(d) === todayK, key: dateKey(d) };
    });
    const last = ds[ds.length - 1];
    const month = new Date(monday).toLocaleDateString("pt-BR", { month: "long" });
    return {
      days: ds,
      dayKeys: ds.map((d) => d.key),
      rangeLabel: `${ds[0].d} – ${last.d} de ${month}, ${monday.getFullYear()}`,
    };
  }, []);

  const events = useMemo<Evt[]>(() => {
    const dayIndex = new Map(dayKeys.map((k, i) => [k, i]));
    const result: Evt[] = [];
    for (const a of appointments) {
      const cls = STATUS_CLS[a.status];
      if (!cls) continue;
      const key = a.appointmentDateTime.slice(0, 10);
      const d = dayIndex.get(key);
      if (d === undefined) continue;
      const hh = Number(a.appointmentDateTime.slice(11, 13));
      const mm = Number(a.appointmentDateTime.slice(14, 16));
      const h = hh + (mm >= 30 ? 0.5 : 0);
      const service = serviceMap.get(a.serviceId);
      const dur = service ? Math.max(0.5, service.durationMinutes / 60) : 1;
      const customer = customerMap.get(a.customerId);
      const pro = staffMap.get(a.staffId);
      result.push({
        d,
        h,
        dur,
        cls,
        t: customer?.name ?? `Cliente #${a.customerId}`,
        s: `${service?.name ?? "Serviço"} · ${pro?.name ?? ""}`.trim(),
      });
    }
    return result;
  }, [appointments, dayKeys, serviceMap, customerMap, staffMap]);

  // Header KPIs derived from real data.
  const todayK = dateKey(new Date());
  const monthPrefix = todayK.slice(0, 7);
  const kpis = useMemo(() => {
    const todays = appointments.filter((a) => a.appointmentDateTime.slice(0, 10) === todayK);
    const revenue = todays
      .filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW")
      .reduce((sum, a) => sum + (serviceMap.get(a.serviceId)?.price ?? 0), 0);
    const noShowMonth = appointments.filter(
      (a) => a.status === "NO_SHOW" && a.appointmentDateTime.slice(0, 7) === monthPrefix,
    ).length;
    return [
      { l: "Agendamentos hoje", v: String(todays.length) },
      { l: "Na semana", v: String(events.length) },
      { l: "Faturamento previsto (hoje)", v: formatBRL(revenue) },
      { l: "Faltas no mês", v: String(noShowMonth) },
    ];
  }, [appointments, events.length, serviceMap, todayK, monthPrefix]);

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
            <Button className="rounded-[10px] gap-2 bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]">
              <CalendarPlus className="h-3.5 w-3.5" /> Novo agendamento
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l} className="rounded-[14px] border-ry-line p-4">
            <div className="text-[11px] tracking-[0.3px] text-ry-ink-soft">{k.l}</div>
            <div className="font-display text-[26px] font-medium mt-1">{k.v}</div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[14px] border-ry-line overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3.5 border-b border-ry-line px-4 py-3.5">
          <div className="flex gap-1.5">
            <button className="rounded-lg border border-ry-line bg-white px-3 py-1.5 text-[11.5px]">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="rounded-lg border border-ry-line bg-white px-3 py-1.5 text-[11.5px]">
              Hoje
            </button>
            <button className="rounded-lg border border-ry-line bg-white px-3 py-1.5 text-[11.5px]">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="font-display text-[17px] font-medium uppercase tracking-wider">
            {rangeLabel}
          </span>
          <div className="ml-auto flex overflow-hidden rounded-[9px] border border-ry-line">
            {["Dia", "Semana", "Mês"].map((t) => (
              <button
                key={t}
                className={`px-4 py-2 text-[11.5px] ${
                  t === "Semana"
                    ? "bg-ry-blue-600 text-white font-medium"
                    : "bg-white text-ry-ink-soft"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3.5 border-b border-ry-line bg-ry-blue-50 px-4 py-2.5">
          {[
            { l: "Confirmado", c: "bg-ok" },
            { l: "Pendente", c: "bg-warn" },
            { l: "Concluído", c: "bg-done" },
            { l: "Falta", c: "bg-danger" },
          ].map((x) => (
            <span key={x.l} className="inline-flex items-center gap-1.5 text-[10.5px] text-ry-ink-soft">
              <i className={`h-2 w-2 rounded-[3px] ${x.c}`} />
              {x.l}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div
            className="grid min-w-[860px]"
            style={{ gridTemplateColumns: "56px repeat(6, 1fr)" }}
          >
            {/* header row */}
            <div className="border-b border-ry-line bg-white" />
            {days.map((day) => (
              <div
                key={day.key}
                className="border-b border-l border-ry-line bg-white py-2.5 text-center"
              >
                <div className="font-display text-[10.5px] tracking-[1.5px] uppercase text-ry-ink-soft">
                  {day.dow}
                </div>
                <div
                  className={
                    day.today
                      ? "mt-0.5 inline-block rounded-[9px] bg-ry-blue-600 px-2 py-[1px] text-[15px] font-semibold text-white"
                      : "mt-0.5 text-[15px] font-semibold"
                  }
                >
                  {day.d}
                </div>
              </div>
            ))}

            {/* body */}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div
                  className="border-b border-ry-line bg-white pr-2 pt-1 text-right text-[10px] text-ry-ink-soft"
                  style={{ height: CELL }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
                {days.map((_, d) => {
                  const cellEvents = events.filter((e) => e.d === d && Math.floor(e.h) === h);
                  return (
                    <div
                      key={`${d}-${h}`}
                      className="relative border-b border-l border-ry-line bg-white"
                      style={{ height: CELL }}
                    >
                      {cellEvents.map((e, i) => {
                        const top = (e.h - Math.floor(e.h)) * CELL + 2;
                        const height = e.dur * CELL - 6;
                        const endH = e.h + e.dur;
                        return (
                          <div
                            key={i}
                            className={`absolute left-1 right-1 z-[2] cursor-pointer overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-[10px] leading-[1.35] transition-transform hover:-translate-y-[1px] hover:shadow-[0_6px_14px_rgba(29,36,51,.14)] hover:z-[5] ${evtStyles[e.cls]}`}
                            style={{ top, height }}
                          >
                            <b className="block truncate text-[10.5px] font-semibold">{e.t}</b>
                            <small className="opacity-80">
                              {fmtHour(e.h)} – {fmtHour(endH)} · {e.s}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}

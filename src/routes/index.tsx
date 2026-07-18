import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarPlus,
  Download,
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  CalendarCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useServices } from "@/lib/api/hooks/services";
import { useAllAppointmentsByStaff } from "@/lib/api/hooks/appointments";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_STYLE } from "@/lib/api/status";
import { formatBRL } from "@/lib/utils";
import { useDashboardMetrics } from "@/lib/api/hooks/dashboard";
import {
  directionOf,
  formatPercentDelta,
  formatPointsDelta,
  type TrendDirection,
} from "@/lib/dashboard-metrics";

interface Kpi {
  label: string;
  value: string;
  icon: typeof Users;
  delta: string;
  direction: TrendDirection;
  caption: string;
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function DashboardPage() {
  const staffQuery = useStaffList({ size: 200 });
  const servicesQuery = useServices({ size: 200 });
  const staff = useMemo(() => staffQuery.data?.content ?? [], [staffQuery.data]);
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const { appointments } = useAllAppointmentsByStaff(staffIds);
  const metricsQuery = useDashboardMetrics();
  const metrics = metricsQuery.data;

  const serviceMap = useMemo(
    () => new Map((servicesQuery.data?.content ?? []).map((s) => [s.id, s])),
    [servicesQuery.data],
  );
  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const today = todayKey();
  const todays = useMemo(
    () => appointments.filter((a) => a.appointmentDateTime.slice(0, 10) === today),
    [appointments, today],
  );

  const statusCounts = useMemo(() => {
    const counts = { CONFIRMED: 0, PENDING: 0, COMPLETED: 0, NO_SHOW: 0 };
    for (const a of appointments) {
      if (a.status in counts) counts[a.status as keyof typeof counts]++;
    }
    return counts;
  }, [appointments]);

  // Presentation only — every number and comparison below comes from the API.
  const kpis: Kpi[] = [
    {
      label: "Agendamentos hoje",
      value: metrics ? String(metrics.appointmentsToday.value) : "—",
      icon: CalendarCheck,
      delta: formatPercentDelta(metrics?.appointmentsToday.changePercent),
      direction: directionOf(metrics?.appointmentsToday.changePercent),
      caption: "vs. mesmo dia da semana passada",
    },
    {
      label: "Novos clientes (mês)",
      value: metrics ? String(metrics.newCustomers.month) : "—",
      icon: Users,
      delta: metrics
        ? metrics.newCustomers.week > 0
          ? `+${metrics.newCustomers.week} ${metrics.newCustomers.week === 1 ? "novo" : "novos"}`
          : "0 novos"
        : "—",
      direction: (metrics?.newCustomers.week ?? 0) > 0 ? "up" : "flat",
      caption: "essa semana",
    },
    {
      label: "Faturamento previsto (mês)",
      value: metrics ? formatBRL(metrics.expectedRevenue.month) : "—",
      icon: DollarSign,
      delta: formatPercentDelta(metrics?.expectedRevenue.changePercent),
      direction: directionOf(metrics?.expectedRevenue.changePercent),
      caption: "vs. mês passado",
    },
    {
      label: "Taxa de ocupação (semana)",
      value: metrics?.occupancy.rate == null ? "—" : `${Math.round(metrics.occupancy.rate)}%`,
      icon: TrendingUp,
      delta: formatPointsDelta(metrics?.occupancy.changePoints),
      direction: directionOf(metrics?.occupancy.changePoints),
      caption:
        metrics && metrics.occupancy.rate == null ? "sem agenda cadastrada" : "vs. semana passada",
    },
  ];

  const upcoming = useMemo(
    () =>
      [...todays]
        .sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime))
        .slice(0, 6),
    [todays],
  );

  return (
    <>
      <PageHeader
        crumbs={["Dashboard"]}
        title="Dashboard"
        subtitle="Uma visão geral do desempenho da sua operação"
        actions={
          <>
            <Button variant="outline" className="rounded-[10px] gap-2">
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
            <Link to="/agendamentos">
              <Button className="rounded-[10px] gap-2 bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]">
                <CalendarPlus className="h-3.5 w-3.5" />
                Novo agendamento
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-2 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const Arrow = k.direction === "down" ? TrendingDown : TrendingUp;
          return (
            <Card key={k.label} className="rounded-[14px] border-ry-line p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] tracking-[0.3px] text-ry-ink-soft">{k.label}</div>
                  <div className="font-display text-[26px] font-medium mt-1">{k.value}</div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-ry-blue-50 text-ry-blue-600">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                {k.direction === "flat" ? (
                  <span className="text-ry-ink-soft">{k.delta}</span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      k.direction === "up" ? "text-ok" : "text-danger"
                    }`}
                  >
                    <Arrow className="h-3 w-3" />
                    {k.delta}
                  </span>
                )}
                <span className="text-ry-ink-soft">{k.caption}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {metricsQuery.isError && (
        <p className="mb-5 text-[11px] text-danger">Não foi possível carregar as métricas.</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-[14px] border-ry-line p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-ry-line px-5 py-3.5">
            <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
              Próximos atendimentos de hoje
            </span>
            <Link to="/agenda" className="text-[11.5px] text-ry-blue-600 hover:underline">
              Ver agenda →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-ry-ink-soft">
              Nenhum atendimento agendado para hoje.
            </div>
          ) : (
            <ul>
              {upcoming.map((u) => {
                const service = serviceMap.get(u.serviceId);
                const pro = staffMap.get(u.staffId);
                const time = u.appointmentDateTime.slice(11, 16);
                return (
                  <li
                    key={u.id}
                    className="flex items-center gap-4 border-b border-ry-line px-5 py-3 last:border-0 hover:bg-[#FAFBFE]"
                  >
                    <div className="font-display text-[15px] font-medium text-ry-blue-600 w-14">
                      {time}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12.5px] font-medium">
                        {service?.name ?? `Serviço #${u.serviceId}`}
                      </div>
                      <div className="text-[11px] text-ry-ink-soft">
                        {pro?.name ?? `Profissional #${u.staffId}`}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${APPOINTMENT_STATUS_STYLE[u.status]}`}
                    >
                      {APPOINTMENT_STATUS_LABEL[u.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="rounded-[14px] border-ry-line p-5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Resumo
          </span>
          <div className="mt-4 space-y-3">
            {[
              { l: "Confirmados", v: statusCounts.CONFIRMED, c: "bg-ok" },
              { l: "Pendentes", v: statusCounts.PENDING, c: "bg-warn" },
              { l: "Concluídos", v: statusCounts.COMPLETED, c: "bg-done" },
              { l: "Faltas", v: statusCounts.NO_SHOW, c: "bg-danger" },
            ].map((r) => (
              <div key={r.l}>
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="text-ry-ink-soft">{r.l}</span>
                  <b className="font-medium">{r.v}</b>
                </div>
                <div className="h-1.5 rounded-full bg-ry-line overflow-hidden">
                  <div className={`h-full ${r.c}`} style={{ width: `${Math.min(r.v, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

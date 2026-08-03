import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Download } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useServices } from "@/lib/api/hooks/services";
import { useAllAppointmentsByStaff } from "@/lib/api/hooks/appointments";
import { formatBRL } from "@/lib/utils";
import {
  APPOINTMENT_ORIGIN_LABEL,
  APPOINTMENT_ORIGINS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/api/status";
import type { AppointmentOrigin, AppointmentResponse, PaymentMethod } from "@/lib/api/types";

// Fixed, semantic palette reused from the app's existing status colors —
// keeps the new pie chart visually consistent instead of inventing new hues.
const PAYMENT_METHOD_COLOR: Record<PaymentMethod, string> = {
  CASH: "#18A05E",
  PIX: "#2748D9",
  CREDIT_CARD: "#6B46C1",
  DEBIT_CARD: "#D98A0B",
};

const PAYMENT_METHOD_CHART_CONFIG: ChartConfig = {
  CASH: { label: PAYMENT_METHOD_LABEL.CASH, color: PAYMENT_METHOD_COLOR.CASH },
  PIX: { label: PAYMENT_METHOD_LABEL.PIX, color: PAYMENT_METHOD_COLOR.PIX },
  CREDIT_CARD: { label: PAYMENT_METHOD_LABEL.CREDIT_CARD, color: PAYMENT_METHOD_COLOR.CREDIT_CARD },
  DEBIT_CARD: { label: PAYMENT_METHOD_LABEL.DEBIT_CARD, color: PAYMENT_METHOD_COLOR.DEBIT_CARD },
};

// WhatsApp keeps its brand green for instant recognition; manual bookings get
// a neutral tone so it doesn't compete with the payment palette above.
const ORIGIN_COLOR: Record<AppointmentOrigin, string> = {
  WHATSAPP: "#25D366",
  MANUAL: "#64748B",
};

const ORIGIN_CHART_CONFIG: ChartConfig = {
  WHATSAPP: { label: APPOINTMENT_ORIGIN_LABEL.WHATSAPP, color: ORIGIN_COLOR.WHATSAPP },
  MANUAL: { label: APPOINTMENT_ORIGIN_LABEL.MANUAL, color: ORIGIN_COLOR.MANUAL },
};

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
  head: () => ({
    meta: [
      { title: "Relatórios — Replyon" },
      { name: "description", content: "Faturamento, ocupação e desempenho por profissional." },
    ],
  }),
});

const isRealized = (a: AppointmentResponse) =>
  a.status !== "CANCELLED" && a.status !== "NO_SHOW";

/** Money actually received — only a completed appointment has a frozen amount charged. */
const isCompleted = (a: AppointmentResponse) => a.status === "COMPLETED";

/**
 * "Top serviços" reads as popularity/projection, not cash received: it keeps
 * the live service price, but a still-PENDING appointment isn't confirmed
 * business yet, so it's excluded here too (same principle as the Home's
 * revenue projection).
 */
const countsForTopServices = (a: AppointmentResponse) =>
  a.status === "CONFIRMED" || a.status === "COMPLETED";

function RelatoriosPage() {
  const staffQuery = useStaffList({ size: 200 });
  const servicesQuery = useServices({ size: 200 });
  const staff = staffQuery.data?.content ?? [];
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const { appointments } = useAllAppointmentsByStaff(staffIds);

  const serviceMap = useMemo(
    () => new Map((servicesQuery.data?.content ?? []).map((s) => [s.id, s])),
    [servicesQuery.data],
  );
  const priceOf = (id: number) => serviceMap.get(id)?.price ?? 0;

  // Revenue per month for the last 6 months.
  const months = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; m: string; v: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        m: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        v: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const a of appointments) {
      // Real money received, frozen at completion time — not the live service price.
      if (!isCompleted(a)) continue;
      const bucket = byKey.get(a.appointmentDateTime.slice(0, 7));
      if (bucket) bucket.v += a.amountCharged ?? 0;
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);
  const maxMonth = Math.max(1, ...months.map((x) => x.v));

  // Top services by confirmed/completed appointment count (live price — this
  // reads as popularity, not cash received).
  const top = useMemo(() => {
    const agg = new Map<number, { count: number; revenue: number }>();
    for (const a of appointments) {
      if (!countsForTopServices(a)) continue;
      const cur = agg.get(a.serviceId) ?? { count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += priceOf(a.serviceId);
      agg.set(a.serviceId, cur);
    }
    return [...agg.entries()]
      .map(([id, v]) => ({ name: serviceMap.get(id)?.name ?? `Serviço #${id}`, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, serviceMap]);

  // Current-month revenue by payment method — same COMPLETED + amountCharged
  // basis as the monthly chart, just grouped differently.
  const byPaymentMethod = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const totals = new Map<PaymentMethod, number>();
    for (const a of appointments) {
      if (!isCompleted(a) || a.appointmentDateTime.slice(0, 7) !== monthKey || !a.paymentMethod) continue;
      totals.set(a.paymentMethod, (totals.get(a.paymentMethod) ?? 0) + (a.amountCharged ?? 0));
    }
    return PAYMENT_METHODS.map((method) => ({
      method,
      name: PAYMENT_METHOD_LABEL[method],
      value: totals.get(method) ?? 0,
      fill: PAYMENT_METHOD_COLOR[method],
    })).filter((row) => row.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  // Current-month booking channel split — same isRealized basis as the
  // "Atendimentos (mês)" KPI, so the two segments sum to that count.
  const byOrigin = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const counts: Record<AppointmentOrigin, number> = { WHATSAPP: 0, MANUAL: 0 };
    for (const a of appointments) {
      if (!isRealized(a) || a.appointmentDateTime.slice(0, 7) !== monthKey) continue;
      counts[a.origin]++;
    }
    return APPOINTMENT_ORIGINS.map((origin) => ({
      origin,
      name: APPOINTMENT_ORIGIN_LABEL[origin],
      value: counts[origin],
      fill: ORIGIN_COLOR[origin],
    })).filter((row) => row.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  // Current-month KPIs.
  const kpis = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthAppts = appointments.filter((a) => a.appointmentDateTime.slice(0, 7) === monthKey);
    const realized = monthAppts.filter(isRealized);
    const completed = monthAppts.filter(isCompleted);
    const revenue = completed.reduce((s, a) => s + (a.amountCharged ?? 0), 0);
    const cancelled = monthAppts.filter((a) => a.status === "CANCELLED").length;
    const ticket = completed.length ? revenue / completed.length : 0;
    const cancelRate = monthAppts.length ? (cancelled / monthAppts.length) * 100 : 0;
    return [
      { l: "Faturamento (mês)", v: formatBRL(revenue) },
      { l: "Atendimentos (mês)", v: String(realized.length) },
      { l: "Ticket médio", v: formatBRL(ticket) },
      { l: "Cancelamentos", v: `${cancelRate.toFixed(1)}%` },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Relatórios"]}
        title="Relatórios"
        subtitle="Faturamento, atendimentos e serviços mais vendidos"
        actions={
          <Button variant="outline" className="rounded-[10px] gap-2">
            <Download className="h-3.5 w-3.5" /> Exportar PDF
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l} className="rounded-[14px] border-ry-line p-4">
            <div className="text-[11px] tracking-[0.3px] text-ry-ink-soft">{k.l}</div>
            <div className="font-display text-[26px] font-medium mt-1">{k.v}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-[14px] border-ry-line p-5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Faturamento por mês
          </span>
          <div className="mt-6 flex h-52 items-end gap-4">
            {months.map((mo) => (
              <div key={mo.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-[10.5px] text-ry-ink-soft">{formatBRL(mo.v)}</div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-ry-blue-700 to-ry-blue-500"
                  style={{ height: `${(mo.v / maxMonth) * 100}%` }}
                />
                <div className="text-[11px] font-medium capitalize">{mo.m}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[14px] border-ry-line p-5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Top serviços
          </span>
          {top.length === 0 ? (
            <p className="mt-4 text-[12px] text-ry-ink-soft">Sem atendimentos registrados.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {top.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-ry-blue-50 text-[11px] font-medium text-ry-blue-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-medium">{t.name}</div>
                    <div className="text-[10.5px] text-ry-ink-soft">{t.count} atendimentos</div>
                  </div>
                  <div className="text-[12px] font-medium">{formatBRL(t.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-[14px] border-ry-line p-5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Faturamento por forma de pagamento
          </span>
          {byPaymentMethod.length === 0 ? (
            <p className="mt-4 text-[12px] text-ry-ink-soft">Sem pagamentos registrados neste mês.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <ChartContainer config={PAYMENT_METHOD_CHART_CONFIG} className="mx-auto aspect-square max-h-52">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        nameKey="method"
                        formatter={(value) => formatBRL(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={byPaymentMethod}
                    dataKey="value"
                    nameKey="method"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {byPaymentMethod.map((row) => (
                      <Cell key={row.method} fill={row.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <ul className="space-y-3">
                {byPaymentMethod.map((row, i) => (
                  <li key={row.method} className="flex items-center gap-3">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-medium text-white"
                      style={{ background: row.fill }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium">{row.name}</div>
                    </div>
                    <div className="text-[12px] font-medium">{formatBRL(row.value)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="rounded-[14px] border-ry-line p-5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Origem dos agendamentos
          </span>
          {byOrigin.length === 0 ? (
            <p className="mt-4 text-[12px] text-ry-ink-soft">Sem atendimentos registrados neste mês.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <ChartContainer config={ORIGIN_CHART_CONFIG} className="mx-auto aspect-square max-h-52">
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel nameKey="origin" />}
                  />
                  <Pie
                    data={byOrigin}
                    dataKey="value"
                    nameKey="origin"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {byOrigin.map((row) => (
                      <Cell key={row.origin} fill={row.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <ul className="space-y-3">
                {byOrigin.map((row) => {
                  const total = byOrigin.reduce((s, r) => s + r.value, 0);
                  const pct = total ? Math.round((row.value / total) * 100) : 0;
                  return (
                    <li key={row.origin} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: row.fill }}
                      />
                      <div className="flex-1">
                        <div className="text-[12px] font-medium">{row.name}</div>
                      </div>
                      <div className="text-[12px] font-medium">
                        {row.value} <span className="text-ry-ink-soft">({pct}%)</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

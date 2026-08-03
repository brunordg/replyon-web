import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Download, Check, CheckCheck, UserX, X, CalendarDays, Filter } from "lucide-react";
import { NovoAgendamentoDialog } from "@/components/novo-agendamento-dialog";
import { ConcluirAgendamentoDialog } from "@/components/concluir-agendamento-dialog";
import { Combobox } from "@/components/combobox";
import { StaffFilter } from "@/components/staff-filter";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useCustomers } from "@/lib/api/hooks/customers";
import { useServices } from "@/lib/api/hooks/services";
import { useAllAppointmentsByStaff, useAppointmentAction } from "@/lib/api/hooks/appointments";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_STYLE } from "@/lib/api/status";
import { colorFromString, formatBRL, formatDateTime, initials } from "@/lib/utils";
import { dateKey, startOfDay } from "@/lib/agenda-range";
import { formatLongDate } from "@/lib/appointment-slots";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import type { AppointmentStatus } from "@/lib/api/types";

export const Route = createFileRoute("/agendamentos")({
  component: AgendamentosPage,
  head: () => ({
    meta: [
      { title: "Agendamentos — Replyon" },
      {
        name: "description",
        content: "Gerencie, confirme e reagende os atendimentos da sua empresa.",
      },
    ],
  }),
});

const filters = ["Todos", "Confirmados", "Pendentes", "Concluídos", "Faltas"] as const;
type Filter = (typeof filters)[number];

const FILTER_STATUS: Record<Exclude<Filter, "Todos">, AppointmentStatus> = {
  Confirmados: "CONFIRMED",
  Pendentes: "PENDING",
  Concluídos: "COMPLETED",
  Faltas: "NO_SHOW",
};

function AgendamentosPage() {
  const [active, setActive] = useState<Filter>("Todos");
  const [completingId, setCompletingId] = useState<number | null>(null);

  const [dateFrom, setDateFrom] = useState<Date>(() => startOfDay(new Date()));
  const [dateTo, setDateTo] = useState<Date>(() => startOfDay(new Date()));
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  /** Mantido para que o gatilho do filtro continue exibindo o cliente escolhido mesmo que o texto de busca mude. */
  const [customerLabel, setCustomerLabel] = useState<string>("");
  const [customerQuery, setCustomerQuery] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<Set<number>>(() => new Set());

  const staffQuery = useStaffList({ size: 200 });
  const customersQuery = useCustomers({ size: 200 });
  const servicesQuery = useServices({ size: 200 });

  // A busca do *filtro* de cliente roda no servidor, assim como o combobox do
  // novo-agendamento-dialog: a query `size: 200` acima serve só para rotular
  // linhas já exibidas em tela, e esconderia silenciosamente qualquer cliente
  // além do #200 deste dropdown.
  const customerSearch = useDebouncedValue(customerQuery).trim();
  const customerFilterQuery = useCustomers({ size: 20, name: customerSearch || undefined });

  const staff = staffQuery.data?.content ?? [];
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const customers = customersQuery.data?.content ?? [];
  const customerFilterOptions = useMemo(
    () =>
      (customerFilterQuery.data?.content ?? []).map((c) => ({
        value: String(c.id),
        label: c.name,
        hint: c.email ?? undefined,
      })),
    [customerFilterQuery.data],
  );

  const {
    appointments,
    isLoading: apptLoading,
    isError: apptError,
    error,
    refetch,
  } = useAllAppointmentsByStaff(staffIds);

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const customerMap = useMemo(
    () => new Map((customersQuery.data?.content ?? []).map((c) => [c.id, c])),
    [customersQuery.data],
  );
  const serviceMap = useMemo(
    () => new Map((servicesQuery.data?.content ?? []).map((s) => [s.id, s])),
    [servicesQuery.data],
  );

  const action = useAppointmentAction();

  const today = useMemo(() => startOfDay(new Date()), []);
  const hasFilters =
    dateKey(dateFrom) !== dateKey(today) ||
    dateKey(dateTo) !== dateKey(today) ||
    customerId !== "" ||
    selectedStaff.size > 0;

  function clearFilters() {
    setDateFrom(startOfDay(new Date()));
    setDateTo(startOfDay(new Date()));
    setCustomerId("");
    setCustomerLabel("");
    setCustomerQuery("");
    setSelectedStaff(new Set());
  }

  // Os filtros se combinam com E; a etapa de ordenação sempre roda por último
  // para que as linhas visíveis fiquem do mais recente para o mais antigo,
  // independentemente de quais filtros estejam ativos.
  const rows = useMemo(() => {
    const fromKey = dateKey(dateFrom);
    const toKey = dateKey(dateTo);
    const filtered = appointments.filter((a) => {
      const apptKey = a.appointmentDateTime.slice(0, 10);
      if (apptKey < fromKey || apptKey > toKey) return false;
      if (customerId !== "" && String(a.customerId) !== customerId) return false;
      if (selectedStaff.size > 0 && !selectedStaff.has(a.staffId)) return false;
      if (active !== "Todos" && a.status !== FILTER_STATUS[active]) return false;
      return true;
    });
    return filtered.sort((a, b) => b.appointmentDateTime.localeCompare(a.appointmentDateTime));
  }, [appointments, active, dateFrom, dateTo, customerId, selectedStaff]);

  const isLoading =
    staffQuery.isLoading || apptLoading || customersQuery.isLoading || servicesQuery.isLoading;
  const isError = staffQuery.isError || apptError;

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Agendamentos"]}
        title="Agendamentos"
        subtitle="Gerencie, confirme e reagende os atendimentos da sua empresa"
        actions={
          <>
            <Button className="rounded-[10px] gap-2 bg-ry-accent hover:brightness-110 text-white shadow-[0_6px_16px_rgba(242,107,38,.28)]">
              <Download className="h-3.5 w-3.5" /> Exportar Excel
            </Button>
            <NovoAgendamentoDialog />
          </>
        }
      />

      <Card className="rounded-[14px] border-ry-line overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-ry-line bg-ry-blue-50 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ry-ink-soft">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </span>

          <DateFilterButton
            label="De"
            date={dateFrom}
            open={dateFromOpen}
            onOpenChange={setDateFromOpen}
            onSelect={(d) => {
              setDateFrom(d);
              if (d > dateTo) setDateTo(d);
            }}
          />
          <DateFilterButton
            label="Até"
            date={dateTo}
            open={dateToOpen}
            onOpenChange={setDateToOpen}
            onSelect={(d) => {
              setDateTo(d);
              if (d < dateFrom) setDateFrom(d);
            }}
          />

          <div className="w-48">
            <Combobox
              value={customerId}
              valueLabel={customerLabel}
              onChange={(id) => {
                setCustomerId(id);
                setCustomerLabel(customerFilterOptions.find((o) => o.value === id)?.label ?? "");
              }}
              options={customerFilterOptions}
              onSearchChange={setCustomerQuery}
              loading={customerFilterQuery.isFetching}
              placeholder="Todos clientes"
              searchPlaceholder="Buscar cliente…"
              emptyLabel="Nenhum cliente encontrado."
            />
          </div>

          <StaffFilter staff={staff} selected={selectedStaff} onChange={setSelectedStaff} />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] text-ry-ink-soft transition hover:text-ry-blue-600"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-ry-line px-4 py-3.5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Próximos atendimentos
          </span>
          <div className="ml-3 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
                  active === f
                    ? "border-ry-blue-500 bg-ry-blue-50 text-ry-blue-600 font-medium"
                    : "border-ry-line bg-white text-ry-ink-soft"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState label="Nenhum agendamento encontrado." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr>
                    {[
                      "Código",
                      "Cliente",
                      "Serviço",
                      "Profissional",
                      "Data e hora",
                      "Valor",
                      "Status",
                      "Ações",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-ry-line bg-ry-blue-50 px-4 py-3 text-left font-display text-[10.5px] font-medium uppercase tracking-[1.5px] text-ry-ink-soft whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const customer = customerMap.get(a.customerId);
                    const service = serviceMap.get(a.serviceId);
                    const pro = staffMap.get(a.staffId);
                    const customerName = customer?.name ?? `Cliente #${a.customerId}`;
                    return (
                      <tr key={a.id} className="hover:bg-[#FAFBFE]">
                        <td className="border-b border-ry-line px-4 py-3 text-[12px] font-medium text-ry-blue-600 whitespace-nowrap">
                          AG-{a.id}
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 text-[12px] whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-semibold text-white"
                              style={{ background: colorFromString(customerName) }}
                            >
                              {initials(customerName)}
                            </div>
                            <div>
                              <b className="block text-[12px] font-medium">{customerName}</b>
                              <span className="text-[10.5px] text-ry-ink-soft">
                                {customer?.email ?? "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 text-[12px] whitespace-nowrap">
                          {service?.name ?? `Serviço #${a.serviceId}`}
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 text-[12px] whitespace-nowrap">
                          {pro?.name ?? `#${a.staffId}`}
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 text-[12px] whitespace-nowrap">
                          {formatDateTime(a.appointmentDateTime)}
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 text-[12px] font-medium whitespace-nowrap">
                          {service ? formatBRL(service.price) : "—"}
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${APPOINTMENT_STATUS_STYLE[a.status]}`}
                          >
                            <i className="h-1.5 w-1.5 rounded-full bg-current" />
                            {APPOINTMENT_STATUS_LABEL[a.status]}
                          </span>
                        </td>
                        <td className="border-b border-ry-line px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1.5">
                            <ActionButton
                              title="Confirmar"
                              icon={Check}
                              disabled={action.isPending || a.status !== "PENDING"}
                              onClick={() => action.mutate({ id: a.id, action: "confirm" })}
                            />
                            <ActionButton
                              title="Concluir"
                              icon={CheckCheck}
                              disabled={action.isPending || a.status !== "CONFIRMED"}
                              onClick={() => setCompletingId(a.id)}
                            />
                            {/* O backend permite marcar falta a partir de PENDING ou CONFIRMED
                                (Appointment.markNoShow) — mesma regra do concluir. */}
                            <ActionButton
                              title="Marcar falta"
                              icon={UserX}
                              disabled={
                                action.isPending ||
                                (a.status !== "PENDING" && a.status !== "CONFIRMED")
                              }
                              onClick={() => action.mutate({ id: a.id, action: "no-show" })}
                            />
                            <ActionButton
                              title="Cancelar"
                              icon={X}
                              disabled={
                                action.isPending ||
                                a.status === "CANCELLED" ||
                                a.status === "COMPLETED"
                              }
                              onClick={() => action.mutate({ id: a.id, action: "cancel" })}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 text-[11.5px] text-ry-ink-soft">
              Mostrando {rows.length} de {appointments.length} agendamentos
            </div>
          </>
        )}
      </Card>

      <ConcluirAgendamentoDialog
        appointmentId={completingId}
        onOpenChange={(open) => !open && setCompletingId(null)}
      />
    </>
  );
}

function DateFilterButton({
  label,
  date,
  open,
  onOpenChange,
  onSelect,
}: {
  label: string;
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (date: Date) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ry-line bg-white px-3 text-[11.5px] transition hover:border-ry-blue-500">
          <CalendarDays className="h-3.5 w-3.5 text-ry-ink-soft" />
          <span className="text-ry-ink-soft">{label}:</span> {formatLongDate(date)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) onSelect(startOfDay(d));
            onOpenChange(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function ActionButton({
  title,
  icon: Icon,
  disabled,
  onClick,
}: {
  title: string;
  icon: typeof Check;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-lg border border-ry-line bg-white text-ry-ink-soft transition-colors hover:border-ry-blue-500 hover:text-ry-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

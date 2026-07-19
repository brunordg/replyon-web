import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  Clock,
  LayoutGrid,
  Loader2,
  Scissors,
  Timer,
  User,
  Users,
} from "lucide-react";
import { Combobox } from "@/components/combobox";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCustomers } from "@/lib/api/hooks/customers";
import { useServices } from "@/lib/api/hooks/services";
import { useStaffList, useStaffServicesMap } from "@/lib/api/hooks/staff";
import { useSlotsByStaff } from "@/lib/api/hooks/availability";
import { useCreateAppointmentWithStatus } from "@/lib/api/hooks/appointments";
import {
  addMinutes,
  detectSlotMinutes,
  formatLongDate,
  slotsRequired,
  toDateParam,
  toLocalDateTime,
} from "@/lib/appointment-slots";
import { cn, colorFromString, formatBRL } from "@/lib/utils";

/**
 * Radix rejects an empty string as a SelectItem value (it reserves "" for the
 * placeholder), so the "clear" entry carries a sentinel that `clearable` maps
 * back to "" — which is what puts the placeholder back on the trigger.
 */
const CLEAR = "__clear__";

function clearable(setter: (value: string) => void) {
  return (value: string) => setter(value === CLEAR ? "" : value);
}

/** Rendered only when the select has a value — there is nothing to clear otherwise. */
function ClearOption() {
  return (
    <>
      <SelectItem value={CLEAR} className="text-ry-ink-soft">
        Limpar seleção
      </SelectItem>
      <SelectSeparator />
    </>
  );
}

/** Midnight today — the earliest bookable day. */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface NovoAgendamentoDialogProps {
  /**
   * Books for this client from the start. It stays editable — the dialog is the
   * same one either way, and locking the field would only surprise someone who
   * opened it from the wrong row.
   */
  customer?: { id: number; name: string };
  /** Replaces the default "Novo agendamento" button. */
  trigger?: React.ReactNode;
}

export function NovoAgendamentoDialog({ customer, trigger }: NovoAgendamentoDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string>(customer ? String(customer.id) : "");
  /** Kept so the trigger keeps showing the chosen client after the list moves on. */
  const [customerLabel, setCustomerLabel] = useState<string>(customer?.name ?? "");
  const [customerQuery, setCustomerQuery] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState<Date>(today());
  const [time, setTime] = useState<string>("");
  const [confirmed, setConfirmed] = useState(true);
  const [notes, setNotes] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer search runs on the server. The old `size: 200` silently truncated:
  // a shop with more than 200 clients simply could not book the rest of them.
  const customerSearch = useDebouncedValue(customerQuery).trim();
  // ACTIVE goes to the server too: filtering it here would let inactive clients
  // eat slots out of the 20 rows that came back.
  const customersQuery = useCustomers({
    size: 20,
    name: customerSearch || undefined,
    status: "ACTIVE",
  });
  const servicesQuery = useServices({ size: 200 });
  const staffQuery = useStaffList({ size: 200 });

  const customers = customersQuery.data?.content ?? [];
  const allServices = useMemo(
    () => (servicesQuery.data?.content ?? []).filter((s) => s.status === "ACTIVE"),
    [servicesQuery.data],
  );
  const allStaff = useMemo(
    () => (staffQuery.data?.content ?? []).filter((s) => s.status === "ACTIVE"),
    [staffQuery.data],
  );

  const staffIds = useMemo(() => allStaff.map((s) => s.id), [allStaff]);
  const { byStaffId, isLoading: assignmentsLoading } = useStaffServicesMap(
    staffIds,
    open && staffIds.length > 0,
  );

  // Business rule: a professional may only be booked for services assigned to
  // them — a barber with only "Corte" must not be offered "Manicure". The
  // filtering runs both ways so the two selects stay consistent whichever the
  // user picks first.
  //
  // While the assignments are still loading we deliberately show the unfiltered
  // lists rather than an empty select; the effect below drops any now-invalid
  // pair once the real data lands.
  const services = useMemo(() => {
    if (!staffId || assignmentsLoading) return allServices;
    const assigned = byStaffId.get(Number(staffId));
    if (!assigned) return allServices;
    return allServices.filter((s) => assigned.includes(s.id));
  }, [allServices, staffId, byStaffId, assignmentsLoading]);

  /** Staff qualified for the chosen service — before availability is considered. */
  const serviceStaff = useMemo(() => {
    if (!serviceId || assignmentsLoading) return allStaff;
    return allStaff.filter((s) => byStaffId.get(s.id)?.includes(Number(serviceId)));
  }, [allStaff, serviceId, byStaffId, assignmentsLoading]);

  // Clearing the *service* (not the staff) is the right direction: picking a
  // professional is the more deliberate choice, and it keeps the two selects
  // from clearing each other in a loop.
  useEffect(() => {
    if (!staffId || !serviceId || assignmentsLoading) return;
    const assigned = byStaffId.get(Number(staffId));
    if (assigned && !assigned.includes(Number(serviceId))) setServiceId("");
  }, [staffId, serviceId, byStaffId, assignmentsLoading]);

  const service = allServices.find((s) => String(s.id) === serviceId);

  // Availability is fanned out over every professional qualified for the service,
  // so the time select works without a professional chosen: the options are the
  // union of everyone's free starts, and picking one narrows the professional
  // list to whoever is actually free then.
  const serviceStaffIds = useMemo(() => serviceStaff.map((s) => s.id), [serviceStaff]);
  const {
    slotsByStaff,
    allSlots,
    isLoading: slotsLoading,
    isError: slotsError,
    unavailableCount,
    serviceDurationMinutes,
  } = useSlotsByStaff(
    serviceStaffIds,
    { date: toDateParam(date), serviceId: serviceId ? Number(serviceId) : undefined },
    open,
  );

  // Only starts where the whole service fits — the backend excludes any start
  // without enough consecutive free slots for `serviceDurationMinutes`.
  // Narrowed to one professional's own slots once they are chosen.
  const slots = useMemo(
    () => (staffId ? (slotsByStaff.get(Number(staffId)) ?? []) : allSlots),
    [staffId, slotsByStaff, allSlots],
  );

  /** Qualified staff, further narrowed to those free at the chosen time. */
  const staff = useMemo(() => {
    if (!time || slotsLoading) return serviceStaff;
    return serviceStaff.filter((s) => slotsByStaff.get(s.id)?.includes(time));
  }, [serviceStaff, time, slotsByStaff, slotsLoading]);

  const staffHasNoServices = !!staffId && !assignmentsLoading && services.length === 0;
  const noStaffForService = !!serviceId && !assignmentsLoading && serviceStaff.length === 0;
  /** Chosen time that nobody qualified can actually take. */
  const noStaffAtTime = !!serviceId && !!time && !slotsLoading && !slotsError && staff.length === 0;

  const durationMinutes = serviceDurationMinutes ?? service?.durationMinutes ?? 0;

  // Grid granularity must come from ONE professional's slots. The union of
  // several can show a gap no real grid has — staff A on 09:00/10:00 and staff B
  // on 09:30/10:30 would look like a 30-min grid when both run on 60.
  const gridSlots = useMemo(() => {
    if (staffId) return slotsByStaff.get(Number(staffId)) ?? [];
    for (const times of slotsByStaff.values()) if (times.length > 1) return times;
    return [];
  }, [staffId, slotsByStaff]);
  const slotMinutes = useMemo(() => detectSlotMinutes(gridSlots), [gridSlots]);
  const required = slotsRequired(durationMinutes, slotMinutes);

  // The selected time can go stale when the service, staff or date changes and
  // the new slot list no longer offers it.
  useEffect(() => {
    if (slotsLoading) return;
    if (time && !slots.includes(time)) setTime("");
  }, [slots, time, slotsLoading]);

  const create = useCreateAppointmentWithStatus();

  /** The time select only needs a service — the professional can come after. */
  const needsSelection = !serviceId;

  function reset() {
    // Back to the client this dialog belongs to, not to blank: reopening it
    // from the same row must not lose the row it was opened from.
    setCustomerId(customer ? String(customer.id) : "");
    setCustomerLabel(customer?.name ?? "");
    setCustomerQuery("");
    setServiceId("");
    setStaffId("");
    setDate(today());
    setTime("");
    setConfirmed(true);
    setNotes("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !serviceId || !staffId || !time) {
      setError("Selecione cliente, serviço, profissional e horário.");
      return;
    }
    // Defense in depth: the selects already exclude unassigned pairs, but a
    // stale assignment fetch shouldn't be able to produce an invalid booking.
    const assigned = byStaffId.get(Number(staffId));
    if (assigned && !assigned.includes(Number(serviceId))) {
      setError("Este profissional não atende o serviço selecionado.");
      return;
    }
    setError(null);
    create.mutate(
      {
        body: {
          customerId: Number(customerId),
          staffId: Number(staffId),
          serviceId: Number(serviceId),
          appointmentDateTime: toLocalDateTime(date, time),
          notes: notes.trim() || undefined,
        },
        confirm: confirmed,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-[10px] gap-2 bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]">
            <CalendarPlus className="h-3.5 w-3.5" /> Novo agendamento
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-[14px] sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-[1.2px]">
            Novo agendamento
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para agendar um atendimento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field icon={User} label="Cliente">
            <Combobox
              value={customerId}
              valueLabel={customerLabel}
              onChange={(value) => {
                setCustomerId(value);
                setCustomerLabel(customers.find((c) => String(c.id) === value)?.name ?? "");
              }}
              onSearchChange={setCustomerQuery}
              loading={customersQuery.isFetching}
              options={customers.map((c) => ({
                value: String(c.id),
                label: c.name,
                hint: c.phone || c.email,
              }))}
              placeholder="Selecione o cliente"
              searchPlaceholder="Buscar cliente pelo nome…"
              emptyLabel="Nenhum cliente encontrado."
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field icon={Scissors} label="Serviço">
              <Select
                value={serviceId}
                onValueChange={clearable(setServiceId)}
                disabled={staffHasNoServices}
              >
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue
                    placeholder={
                      staffHasNoServices ? "Nenhum serviço atribuído" : "Selecione o serviço"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!!serviceId && <ClearOption />}
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      <span className="ml-1.5 text-[11px] text-ry-ink-soft">
                        {s.durationMinutes}min · {formatBRL(s.price)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {staffHasNoServices && (
                <p className="text-[11px] text-ry-ink-soft">
                  Este profissional ainda não tem serviços atribuídos. Configure em Profissionais.
                </p>
              )}
            </Field>

            <Field icon={Users} label="Profissional">
              {/* Local filtering on purpose: `staff` is already narrowed to who
                  performs the service and is free at the chosen time. Searching
                  the server here would hand back professionals who cannot take
                  this booking. */}
              <Combobox
                value={staffId}
                onChange={setStaffId}
                disabled={noStaffForService || noStaffAtTime}
                options={staff.map((s) => ({ value: String(s.id), label: s.name }))}
                placeholder={
                  noStaffForService
                    ? "Nenhum profissional faz este serviço"
                    : noStaffAtTime
                      ? `Ninguém disponível às ${time}`
                      : "Selecione o profissional"
                }
                searchPlaceholder="Buscar profissional…"
                emptyLabel="Nenhum profissional encontrado."
              />
              {noStaffForService && (
                <p className="text-[11px] text-ry-ink-soft">
                  Nenhum profissional ativo tem este serviço atribuído.
                </p>
              )}
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field icon={CalendarDays} label="Data">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 rounded-[10px] font-normal"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-ry-ink-soft" />
                    {formatLongDate(date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(d);
                      setDateOpen(false);
                    }}
                    disabled={{ before: today() }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>

            <Field icon={Clock} label="Horário">
              <Select
                value={time}
                onValueChange={clearable(setTime)}
                disabled={needsSelection || slotsLoading || slots.length === 0}
              >
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue
                    placeholder={
                      needsSelection
                        ? "Escolha o serviço"
                        : slotsLoading
                          ? "Buscando horários..."
                          : slots.length === 0
                            ? "Sem horários disponíveis"
                            : "Selecione o horário"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!!time && <ClearOption />}
                  {slots.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                      {durationMinutes > 0 && (
                        <span className="ml-1.5 text-ry-ink-soft">
                          – {addMinutes(s, durationMinutes)}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Duration, end time and price of the chosen service. Shows as soon as
              a service is picked; the end time fills in once a start is chosen.
              "Ocupa" spells out the grid cost, so a 70-min service taking
              3×30-min slots isn't a surprise. */}
          {service && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ry-ink-soft">
              <Summary icon={Clock} label="Duração" value={`${durationMinutes} min`} />
              {time && durationMinutes > 0 && (
                <Summary
                  icon={Timer}
                  label="Término previsto"
                  value={addMinutes(time, durationMinutes)}
                />
              )}
              <Summary icon={CircleDollarSign} label="Valor" value={formatBRL(service.price)} />
              {required && slotMinutes && (
                <Summary
                  icon={LayoutGrid}
                  label="Ocupa"
                  value={`${required} ${required === 1 ? "slot" : "slots"} de ${slotMinutes} min`}
                />
              )}
            </div>
          )}

          {/* Who can actually take the chosen time. Listed only while no
              professional is picked — once one is, the select already says it.
              Each name is clickable so the list doubles as the picker. */}
          {!needsSelection && !!time && !staffId && !slotsLoading && staff.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-ry-ink-soft">
                Profissionais disponíveis às <b className="font-medium text-ry-ink">{time}</b>:
              </p>
              <div className="flex flex-wrap gap-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStaffId(String(s.id))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ry-line bg-white px-2.5 py-1 text-[11px] transition hover:border-ry-blue-500 hover:text-ry-blue-600"
                  >
                    <i
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: colorFromString(s.name) }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {noStaffAtTime && (
            <p className="text-[11px] font-medium text-danger">
              Nenhum profissional está disponível às {time} nesta data. Escolha outro horário, outra
              data, ou limpe o horário para ver todos os profissionais.
            </p>
          )}

          {/* A staff member whose availability failed to load is left out of the
              lists entirely, so say it — otherwise a professional silently
              disappears and the form looks like it is just missing people. */}
          {!needsSelection && !slotsError && unavailableCount > 0 && (
            <p className="text-[11px] text-ry-ink-soft">
              Não foi possível ler a agenda de {unavailableCount}{" "}
              {unavailableCount === 1 ? "profissional" : "profissionais"} — quem aparece abaixo
              exclui {unavailableCount === 1 ? "ele" : "eles"}.
            </p>
          )}

          {!needsSelection && (
            <p className="text-[11px] text-ry-ink-soft">
              {slotsError ? (
                <span className="text-danger">Não foi possível carregar os horários.</span>
              ) : slotsLoading ? (
                "Buscando horários disponíveis..."
              ) : slots.length === 0 ? (
                "Nenhum horário livre nesta data — tente outro dia ou profissional."
              ) : !time ? (
                <>
                  {slots.length}{" "}
                  {slots.length === 1 ? "horário disponível" : "horários disponíveis"} nesta data
                </>
              ) : null}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Status inicial</Label>
            <div className="grid grid-cols-2 gap-3">
              <StatusToggle
                label="Confirmado"
                active={confirmed}
                onClick={() => setConfirmed(true)}
              />
              <StatusToggle
                label="Pendente"
                active={!confirmed}
                onClick={() => setConfirmed(false)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agendamento-notas">
              Observações <span className="text-ry-ink-soft">(opcional)</span>
            </Label>
            <Textarea
              id="agendamento-notas"
              placeholder="Preferências do cliente, orientações internas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-[11px] text-danger">{error}</p>}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-ry-ink-soft">
        <Icon className="h-3.5 w-3.5 text-ry-blue-600" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-ry-ink-soft" />
      {label}: <b className="font-medium text-ry-ink">{value}</b>
    </span>
  );
}

function StatusToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-[10px] border px-3 py-2 text-[12px] transition",
        active
          ? "border-ry-blue-500 bg-ry-blue-50 font-medium text-ry-blue-600"
          : "border-ry-line bg-white text-ry-ink-soft hover:border-ry-blue-500",
      )}
    >
      {label}
    </button>
  );
}

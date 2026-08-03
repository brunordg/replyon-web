import { useMemo, useState } from "react";
import { CalendarDays, CalendarSearch, Loader2, Scissors, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/combobox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useServices } from "@/lib/api/hooks/services";
import { useStaffList, useStaffServicesMap } from "@/lib/api/hooks/staff";
import { useSlotsByStaff } from "@/lib/api/hooks/availability";
import { useCreateAppointmentWithStatus } from "@/lib/api/hooks/appointments";
import { useCreateCustomerForConversation } from "@/lib/api/hooks/conversations";
import { formatLongDate, toDateParam, toLocalDateTime } from "@/lib/appointment-slots";

/** Meia-noite de hoje — o dia mais antigo consultável, espelha o NovoAgendamentoDialog. */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Consulta de disponibilidade para a conversa em atendimento humano: escolha um
 * serviço, opcionalmente um profissional, e um dia, para ver os horários de início
 * disponíveis. O atendente pode inserir um resumo pronto para edição no compositor
 * de resposta (repassar ao cliente, sem criar nada), ou selecionar um horário e
 * confirmar um agendamento real para ele — cadastrando um cliente pelo nome antes,
 * caso a conversa ainda não tenha um. Nunca interfere no próprio fluxo do
 * NovoAgendamentoDialog.
 */
export function AvailabilityLookupPopover({
  phone,
  customerId,
  onInsert,
}: {
  phone: string;
  customerId: number | null | undefined;
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState<Date>(today());
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());
  const [customerName, setCustomerName] = useState("");

  const createAppointment = useCreateAppointmentWithStatus();
  const createCustomer = useCreateCustomerForConversation(phone);

  // Condicionado por `open` (o `enabled` do react-query) para que nada seja buscado
  // até o atendente realmente abrir o popover — o mesmo padrão preguiçoso usado pelo NovoAgendamentoDialog.
  const servicesQuery = useServices({ size: 200 });
  const staffQuery = useStaffList({ size: 200 });

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

  const serviceStaff = useMemo(() => {
    if (!serviceId || assignmentsLoading) return allStaff;
    return allStaff.filter((s) => byStaffId.get(s.id)?.includes(Number(serviceId)));
  }, [allStaff, serviceId, byStaffId, assignmentsLoading]);

  const serviceStaffIds = useMemo(() => serviceStaff.map((s) => s.id), [serviceStaff]);
  const {
    slotsByStaff,
    allSlots,
    staffAvailableAt,
    isLoading: slotsLoading,
    isError: slotsError,
  } = useSlotsByStaff(
    serviceStaffIds,
    { date: toDateParam(date), serviceId: serviceId ? Number(serviceId) : undefined },
    open,
  );

  const slots = useMemo(
    () => (staffId ? (slotsByStaff.get(Number(staffId)) ?? []) : allSlots),
    [staffId, slotsByStaff, allSlots],
  );

  const service = allServices.find((s) => String(s.id) === serviceId);
  const needsService = !serviceId;
  // Agendar um horário específico só faz sentido com exatamente um horário escolhido —
  // com vários selecionados, o atendente ainda está apenas montando uma mensagem para repassar.
  const singleSelectedTime = selectedTimes.size === 1 ? [...selectedTimes][0] : null;

  function handleServiceChange(value: string) {
    setServiceId(value);
    // Um profissional habilitado para o serviço antigo pode não estar habilitado
    // para o novo — limpar evita consultar silenciosamente uma combinação inválida.
    setStaffId("");
    setSelectedTimes(new Set());
  }

  function handleStaffChange(value: string) {
    setStaffId(value);
    setSelectedTimes(new Set());
  }

  function handleDateChange(next: Date) {
    setDate(next);
    setSelectedTimes(new Set());
    setDateOpen(false);
  }

  function handleSelectTime(time: string) {
    setSelectedTimes((current) => {
      const next = new Set(current);
      if (next.has(time)) {
        next.delete(time);
      } else {
        next.add(time);
      }
      return next;
    });
  }

  function handleInsertSelected() {
    if (!service || selectedTimes.size === 0) return;
    const chosen = slots.filter((s) => selectedTimes.has(s));
    const message = `Tenho esses horários disponíveis para ${service.name}: ${chosen.join(", ")}. Qual fica melhor pra você?`;
    onInsert(message);
    setOpen(false);
  }

  function handleInsertAll() {
    if (!service || slots.length === 0) return;
    const message = `Tenho esses horários disponíveis para ${service.name}: ${slots.join(", ")}. Qual fica melhor pra você?`;
    onInsert(message);
    setOpen(false);
  }

  async function handleConfirmBooking() {
    if (!singleSelectedTime || !service) return;
    const resolvedStaffId = staffId ? Number(staffId) : staffAvailableAt(singleSelectedTime)[0];
    if (!resolvedStaffId) return;

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      if (!customerName.trim()) return;
      try {
        const customer = await createCustomer.mutateAsync(customerName.trim());
        resolvedCustomerId = customer.id;
      } catch {
        // O toast já foi exibido pela própria mutation; mantém a seleção para
        // que o atendente possa apenas tentar de novo em vez de recomeçar.
        return;
      }
    }

    createAppointment.mutate(
      {
        body: {
          customerId: resolvedCustomerId,
          staffId: resolvedStaffId,
          serviceId: Number(serviceId),
          appointmentDateTime: toLocalDateTime(date, singleSelectedTime),
        },
        confirm: true,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setServiceId("");
      setStaffId("");
      setDate(today());
      setSelectedTimes(new Set());
      setCustomerName("");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 rounded-[10px]">
          <CalendarSearch className="mr-1 h-3.5 w-3.5" />
          Consultar horários
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 space-y-3 p-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11.5px] text-ry-ink-soft">
            <Scissors className="h-3.5 w-3.5 text-ry-blue-600" />
            Serviço
          </Label>
          <Select value={serviceId} onValueChange={handleServiceChange}>
            <SelectTrigger className="rounded-[10px]">
              <SelectValue placeholder="Selecione o serviço" />
            </SelectTrigger>
            <SelectContent>
              {allServices.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11.5px] text-ry-ink-soft">
            <Users className="h-3.5 w-3.5 text-ry-blue-600" />
            Profissional
          </Label>
          <Combobox
            value={staffId}
            onChange={handleStaffChange}
            options={serviceStaff.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Qualquer profissional"
            searchPlaceholder="Buscar profissional…"
            emptyLabel="Nenhum profissional encontrado."
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11.5px] text-ry-ink-soft">
            <CalendarDays className="h-3.5 w-3.5 text-ry-blue-600" />
            Dia
          </Label>
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
                  handleDateChange(d);
                }}
                disabled={{ before: today() }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5 border-t border-ry-line pt-3">
          {needsService ? (
            <p className="text-[11.5px] text-ry-ink-soft">Escolha um serviço para ver os horários.</p>
          ) : slotsLoading ? (
            <div className="flex items-center gap-2 text-[11.5px] text-ry-ink-soft">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando horários…
            </div>
          ) : slotsError ? (
            <p className="text-[11.5px] text-danger">Não foi possível carregar os horários.</p>
          ) : slots.length === 0 ? (
            <p className="text-[11.5px] text-ry-ink-soft">Nenhum horário disponível nesta data.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectTime(s)}
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                    selectedTimes.has(s)
                      ? "border-ry-blue-600 bg-ry-blue-600 text-white"
                      : "border-ry-line bg-ry-bg hover:border-ry-blue-500",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {singleSelectedTime && (
          <div className="space-y-2 rounded-[10px] border border-ry-line bg-ry-bg p-3">
            {!customerId && (
              <div className="space-y-1">
                <Label className="text-[11px] text-ry-ink-soft">
                  Cliente ainda não identificado — nome:
                </Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="h-8 rounded-[8px] text-[12.5px]"
                />
              </div>
            )}
            <Button
              onClick={handleConfirmBooking}
              disabled={
                (!customerId && !customerName.trim()) ||
                createAppointment.isPending ||
                createCustomer.isPending
              }
              className="w-full rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {(createAppointment.isPending || createCustomer.isPending) && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Confirmar agendamento às {singleSelectedTime}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleInsertSelected}
            disabled={needsService || slotsLoading || selectedTimes.size === 0}
            className="w-full rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
          >
            Inserir selecionados{selectedTimes.size > 0 ? ` (${selectedTimes.size})` : ""}
          </Button>
          <Button
            onClick={handleInsertAll}
            disabled={needsService || slotsLoading || slots.length === 0}
            variant="outline"
            className="w-full rounded-[10px]"
          >
            Inserir todos
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

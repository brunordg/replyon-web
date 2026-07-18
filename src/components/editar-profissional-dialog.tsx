import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, Clock } from "lucide-react";
import { useStaffServices, useUpdateStaffWithServices } from "@/lib/api/hooks/staff";
import { useServices } from "@/lib/api/hooks/services";
import { useSaveSchedule, useStaffSchedule } from "@/lib/api/hooks/schedules";
import { HorariosSemanais } from "@/components/horarios-semanais";
import {
  DEFAULT_WEEK,
  toScheduleRequest,
  toWeekState,
  validateWeek,
  type WeekState,
} from "@/lib/schedule-week";
import { cn, formatBRL } from "@/lib/utils";
import type { ScheduleDay, StaffResponse } from "@/lib/api/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Interval presets, in minutes. The backend accepts anything from 5 to 480. */
const INTERVALS = [15, 20, 30, 45, 60, 90, 120];

export function EditarProfissionalDialog({
  staff,
  trigger,
  defaultTab = "dados",
}: {
  staff: StaffResponse;
  trigger?: React.ReactNode;
  defaultTab?: "dados" | "horarios";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>(defaultTab);

  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [specialties, setSpecialties] = useState(staff.specialties.join(", "));
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const [week, setWeek] = useState<WeekState>(DEFAULT_WEEK);
  const [interval, setInterval] = useState("30");
  const [weekErrors, setWeekErrors] = useState<Partial<Record<ScheduleDay, string>>>({});

  const updateStaff = useUpdateStaffWithServices();
  const saveSchedule = useSaveSchedule();
  const { data: servicesPage, isLoading: servicesLoading } = useServices({ size: 200 });
  const services = servicesPage?.content ?? [];
  const { data: currentServiceIds, isLoading: currentLoading } = useStaffServices(staff.id, open);
  const { data: schedule, isLoading: scheduleLoading } = useStaffSchedule(staff.id, open);

  // Reseed text fields whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setName(staff.name);
      setEmail(staff.email);
      setPhone(staff.phone ?? "");
      setSpecialties(staff.specialties.join(", "));
      setErrors({});
      setWeekErrors({});
    }
  }, [open, staff, defaultTab]);

  // Seed the selected services once the current assignments load (once per open).
  const servicesSeeded = useRef(false);
  useEffect(() => {
    if (!open) {
      servicesSeeded.current = false;
      return;
    }
    if (!servicesSeeded.current && currentServiceIds) {
      setSelectedServices(new Set(currentServiceIds));
      servicesSeeded.current = true;
    }
  }, [open, currentServiceIds]);

  // Seed the week once the schedule loads. A staff member with no schedule yet
  // keeps the default week.
  const weekSeeded = useRef(false);
  useEffect(() => {
    if (!open) {
      weekSeeded.current = false;
      return;
    }
    if (weekSeeded.current || scheduleLoading) return;
    setWeek(schedule ? toWeekState(schedule) : DEFAULT_WEEK());
    setInterval(String(schedule?.intervalBetweenAppointments ?? 30));
    weekSeeded.current = true;
  }, [open, scheduleLoading, schedule]);

  function toggleService(id: number) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: { name?: string; email?: string } = {};
    if (!name.trim()) nextErrors.name = "Informe o nome.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    else if (!EMAIL_RE.test(email.trim())) nextErrors.email = "E-mail inválido.";
    setErrors(nextErrors);

    const nextWeekErrors = validateWeek(week);
    setWeekErrors(nextWeekErrors);

    // Surface whichever tab holds the first problem.
    if (Object.keys(nextErrors).length > 0) {
      setTab("dados");
      return;
    }
    if (Object.keys(nextWeekErrors).length > 0) {
      setTab("horarios");
      return;
    }

    const specialtiesList = specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    updateStaff.mutate(
      {
        id: staff.id,
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          specialties: specialtiesList,
        },
        serviceIds: [...selectedServices],
        currentServiceIds: currentServiceIds ?? [],
      },
      {
        onSuccess: () =>
          saveSchedule.mutate(
            {
              staffId: staff.id,
              scheduleId: schedule?.id ?? null,
              body: toScheduleRequest(week, Number(interval)),
            },
            { onSuccess: () => setOpen(false) },
          ),
      },
    );
  }

  const pending = updateStaff.isPending || saveSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="flex-1 rounded-[10px] text-[11.5px] h-8">
            Editar
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-[14px] sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Editar profissional</DialogTitle>
          <DialogDescription>Atualize os dados e horários de {staff.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="horarios">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Horários semanais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-pro-nome">Nome</Label>
                <Input id="edit-pro-nome" value={name} onChange={(e) => setName(e.target.value)} />
                {errors.name && <p className="text-[11px] text-danger">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pro-email">E-mail</Label>
                  <Input
                    id="edit-pro-email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && <p className="text-[11px] text-danger">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-pro-telefone">
                    Telefone <span className="text-ry-ink-soft">(opcional)</span>
                  </Label>
                  <Input
                    id="edit-pro-telefone"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-pro-especialidades">
                  Especialidades <span className="text-ry-ink-soft">(separadas por vírgula)</span>
                </Label>
                <Input
                  id="edit-pro-especialidades"
                  placeholder="Ex: Cabelo, Barba, Estética"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Serviços que presta{" "}
                  <span className="text-ry-ink-soft">
                    ({selectedServices.size} selecionado{selectedServices.size === 1 ? "" : "s"})
                  </span>
                </Label>
                {servicesLoading || currentLoading ? (
                  <p className="text-[12px] text-ry-ink-soft py-2">Carregando serviços…</p>
                ) : services.length === 0 ? (
                  <p className="text-[12px] text-ry-ink-soft py-2">Nenhum serviço cadastrado.</p>
                ) : (
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-[10px] border border-ry-line p-2.5">
                    {services.map((s) => {
                      const selected = selectedServices.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition",
                            selected
                              ? "border-ry-blue-500 bg-ry-blue-50 text-ry-blue-600 font-medium"
                              : "border-ry-line bg-white text-ry-ink-soft hover:border-ry-blue-300",
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                          {s.name}
                          <span className="text-ry-ink-soft">· {formatBRL(s.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="horarios" className="space-y-3 pt-4">
              {scheduleLoading ? (
                <p className="py-6 text-center text-[12px] text-ry-ink-soft">
                  Carregando horários…
                </p>
              ) : (
                <>
                  <HorariosSemanais week={week} onChange={setWeek} errors={weekErrors} />

                  <div className="flex flex-wrap items-center gap-3 border-t border-ry-line pt-3">
                    <Label htmlFor="agenda-intervalo" className="text-[12px]">
                      Intervalo entre atendimentos
                    </Label>
                    <Select value={interval} onValueChange={setInterval}>
                      <SelectTrigger id="agenda-intervalo" className="h-8 w-40 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVALS.map((minutes) => (
                          <SelectItem key={minutes} value={String(minutes)}>
                            {minutes} minutos
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-5">
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar profissional
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { useStaffList } from "@/lib/api/hooks/staff";
import {
  useCreateTimeBlocks,
  useUpdateTimeBlocks,
  type TimeBlockDraft,
} from "@/lib/api/hooks/timeblocks";
import { addDays, dateKey } from "@/lib/agenda-range";
import { formatLongDate } from "@/lib/appointment-slots";
import { BLOCK_TYPES, RECURRENCE_PATTERNS, isAllDay, type BlockGroup } from "@/lib/time-blocks";

/** Sentinel for "todos os profissionais" — Radix reserves "" for the placeholder. */
const ALL_STAFF = "__all__";

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface NovoBloqueioDialogProps {
  /** Present when editing: the dialog pre-fills and updates every sibling. */
  group?: BlockGroup;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Omitted in edit mode, where the trigger is the card's "Editar" button. */
  trigger?: React.ReactNode;
}

export function NovoBloqueioDialog({
  group,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: NovoBloqueioDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const editing = group != null;

  const [staffValue, setStaffValue] = useState<string>(ALL_STAFF);
  const [type, setType] = useState<string>("LUNCH_BREAK");
  const [date, setDate] = useState<Date>(today());
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [recurring, setRecurring] = useState(false);
  const [pattern, setPattern] = useState<string>("WEEKLY");
  const [reason, setReason] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffQuery = useStaffList({ size: 200 });
  const staff = useMemo(
    () => (staffQuery.data?.content ?? []).filter((s) => s.status === "ACTIVE"),
    [staffQuery.data],
  );

  const createBlocks = useCreateTimeBlocks();
  const updateBlocks = useUpdateTimeBlocks();
  const pending = createBlocks.isPending || updateBlocks.isPending;

  // Re-seeds the form whenever the dialog opens. Keyed on `open` rather than run
  // once, so reopening a card after an edit never shows the previous draft.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!group) {
      setStaffValue(ALL_STAFF);
      setType("LUNCH_BREAK");
      setDate(today());
      setAllDay(false);
      setStart("12:00");
      setEnd("13:00");
      setRecurring(false);
      setPattern("WEEKLY");
      setReason("");
      return;
    }
    const s = group.sample;
    setStaffValue(group.staffIds.length === 1 ? String(group.staffIds[0]) : ALL_STAFF);
    setType(s.type);
    setDate(new Date(s.startDateTime));
    const whole = isAllDay(s.startDateTime, s.endDateTime);
    setAllDay(whole);
    setStart(whole ? "08:00" : s.startDateTime.slice(11, 16));
    setEnd(whole ? "18:00" : s.endDateTime.slice(11, 16));
    setRecurring(s.isRecurring && s.recurrencePattern !== "NONE");
    setPattern(
      s.recurrencePattern && s.recurrencePattern !== "NONE" ? s.recurrencePattern : "WEEKLY",
    );
    setReason(s.reason ?? "");
  }, [open, group]);

  /**
   * A whole day is stored as midnight to the next midnight — the same half-open
   * interval the backend uses everywhere, so a block ending at 00:00 does not
   * bleed into the following day's first slot.
   */
  function buildWindow(): { startDateTime: string; endDateTime: string } {
    if (allDay) {
      return {
        startDateTime: `${dateKey(date)}T00:00:00`,
        endDateTime: `${dateKey(addDays(date, 1))}T00:00:00`,
      };
    }
    return {
      startDateTime: `${dateKey(date)}T${start}:00`,
      // An end earlier than the start means the block runs past midnight.
      endDateTime: `${dateKey(end <= start ? addDays(date, 1) : date)}T${end}:00`,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allDay && end === start) {
      setError("O horário final precisa ser diferente do inicial.");
      return;
    }

    const draft: TimeBlockDraft = {
      type,
      ...buildWindow(),
      reason: reason.trim() || undefined,
      isRecurring: recurring,
      recurrencePattern: recurring ? pattern : "NONE",
    };

    if (editing) {
      updateBlocks.mutate(
        { targets: group.members.map((m) => ({ staffId: m.staffId, id: m.id })), patch: draft },
        {
          onSuccess: () => setOpen(false),
          onError: (err) =>
            setError(err instanceof Error ? err.message : "Não foi possível salvar."),
        },
      );
      return;
    }

    const staffIds = staffValue === ALL_STAFF ? staff.map((s) => s.id) : [Number(staffValue)];
    if (staffIds.length === 0) {
      setError("Nenhum profissional ativo para bloquear.");
      return;
    }

    createBlocks.mutate(
      { staffIds, block: draft },
      {
        onSuccess: (result) => {
          // Partial success is still success — say what did not land instead of
          // pretending the whole thing failed.
          if (result.failed > 0) {
            setError(
              `Bloqueio criado para ${result.created} de ${staffIds.length} profissionais. Tente novamente para os demais.`,
            );
            return;
          }
          setOpen(false);
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Não foi possível criar."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="rounded-[14px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar bloqueio" : "Novo bloqueio"}</DialogTitle>
          <DialogDescription>
            Períodos bloqueados deixam de aparecer como horário disponível para agendamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={staffValue} onValueChange={setStaffValue} disabled={editing}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STAFF}>Todos os profissionais</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing && group.staffIds.length > 1 && (
                <p className="text-[11px] text-ry-ink-soft">
                  A alteração vale para os {group.staffIds.length} profissionais deste bloqueio.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{recurring ? "A partir de" : "Data"}</Label>
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
                    if (d) setDate(d);
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between rounded-[10px] border border-ry-line px-3 py-2.5">
            <Label htmlFor="bloqueio-dia-inteiro" className="cursor-pointer">
              Dia inteiro
            </Label>
            <Switch id="bloqueio-dia-inteiro" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio-inicio">Início</Label>
                <Input
                  id="bloqueio-inicio"
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio-fim">Término</Label>
                <Input
                  id="bloqueio-fim"
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
                {end < start && (
                  <p className="text-[11px] text-ry-ink-soft">Termina no dia seguinte.</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-[10px] border border-ry-line px-3 py-2.5">
              <Label htmlFor="bloqueio-recorrente" className="cursor-pointer">
                Repetir
              </Label>
              <Switch id="bloqueio-recorrente" checked={recurring} onCheckedChange={setRecurring} />
            </div>
            {recurring && (
              <Select value={pattern} onValueChange={setPattern}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue placeholder="Frequência" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_PATTERNS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bloqueio-motivo">
              Motivo <span className="text-ry-ink-soft">(opcional)</span>
            </Label>
            <Textarea
              id="bloqueio-motivo"
              rows={2}
              placeholder="Ex: Almoço, feriado municipal, treinamento"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-[11.5px] text-danger">{error}</p>}

          <DialogFooter className="gap-2">
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
              {editing ? "Salvar" : "Criar bloqueio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The page-header button; `Plus` matches the other "Novo …" actions. */
export function NovoBloqueioTrigger() {
  return (
    <NovoBloqueioDialog
      trigger={
        <Button className="rounded-[10px] gap-2 bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]">
          <Plus className="h-3.5 w-3.5" /> Novo bloqueio
        </Button>
      }
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, Calendar, CalendarDays, Clock, Loader2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { addDays, dateKey, startOfDay } from "@/lib/agenda-range";
import { formatLongDate } from "@/lib/appointment-slots";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useAllTimeBlocks, useDeleteTimeBlocks } from "@/lib/api/hooks/timeblocks";
import { NovoBloqueioDialog, NovoBloqueioTrigger } from "@/components/novo-bloqueio-dialog";
import {
  blockTypeLabel,
  groupBlocks,
  recurrenceLabel,
  staffLabel,
  timeRangeLabel,
  type BlockGroup,
} from "@/lib/time-blocks";
import { formatDate } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";

export const Route = createFileRoute("/bloqueios")({
  component: BloqueiosPage,
  head: () => ({
    meta: [
      { title: "Bloqueios — Replyon" },
      { name: "description", content: "Bloqueios de agenda: pausas, folgas e indisponibilidades." },
    ],
  }),
});

/** A month back and a month forward — recent history plus what is already planned. */
const DEFAULT_DAYS_BACK = 30;
const DEFAULT_DAYS_AHEAD = 30;

/** One date picker; both ends of the range use it. */
function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-ry-ink-soft">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 gap-2 rounded-[10px] text-[12px] font-normal">
            <CalendarDays className="h-3.5 w-3.5 text-ry-ink-soft" />
            {formatLongDate(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarPicker
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) onChange(startOfDay(d));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function BloqueiosPage() {
  const [from, setFrom] = useState(() => addDays(startOfDay(new Date()), -DEFAULT_DAYS_BACK));
  const [to, setTo] = useState(() => addDays(startOfDay(new Date()), DEFAULT_DAYS_AHEAD));

  const staffQuery = useStaffList({ size: 200 });
  const staff = useMemo(
    () => (staffQuery.data?.content ?? []).filter((s) => s.status === "ACTIVE"),
    [staffQuery.data],
  );
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const staffNames = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);

  const { blocks, isLoading, isError, error, refetch } = useAllTimeBlocks(staffIds, {
    startDate: dateKey(from),
    endDate: dateKey(to),
  });
  const groups = useMemo(() => groupBlocks(blocks), [blocks]);

  const [editing, setEditing] = useState<BlockGroup | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const deleteBlocks = useDeleteTimeBlocks();

  function handleRemove(group: BlockGroup) {
    setRemoving(group.key);
    deleteBlocks.mutate(
      group.members.map((m) => ({ staffId: m.staffId, id: m.id })),
      { onSettled: () => setRemoving(null) },
    );
  }

  const loading = staffQuery.isLoading || isLoading;

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Bloqueios"]}
        title="Bloqueios"
        subtitle="Períodos indisponíveis na agenda: pausas, folgas e feriados"
        actions={<NovoBloqueioTrigger />}
      />

      <Card className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border-ry-line px-5 py-3.5">
        <DateFilter label="De" value={from} onChange={setFrom} />
        <DateFilter label="Até" value={to} onChange={setTo} />
        <Button
          variant="ghost"
          className="h-8 rounded-[10px] text-[11.5px] text-ry-ink-soft"
          onClick={() => {
            setFrom(addDays(startOfDay(new Date()), -DEFAULT_DAYS_BACK));
            setTo(addDays(startOfDay(new Date()), DEFAULT_DAYS_AHEAD));
          }}
        >
          Restaurar período
        </Button>
        {to < from && (
          <span className="text-[11.5px] text-danger">
            A data final é anterior à inicial — nenhum bloqueio será encontrado.
          </span>
        )}
      </Card>

      {loading ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <LoadingState />
        </Card>
      ) : staffQuery.isError || isError ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <ErrorState error={error ?? staffQuery.error} onRetry={refetch} />
        </Card>
      ) : groups.length === 0 ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          {/* Naming the period matters: an empty screen otherwise reads as
              "nothing exists" when it really means "nothing in this range". */}
          <EmptyState label="Nenhum bloqueio no período selecionado." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const b = group.sample;
            const busy = removing === group.key;
            return (
              <Card key={group.key} className="rounded-[14px] border-ry-line p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#EDF0F7] text-ry-ink-soft">
                    <Ban className="h-5 w-5" />
                  </div>
                  <div>
                    <b className="block text-[13px] font-medium">
                      {b.reason || blockTypeLabel(b.type)}
                    </b>
                    <span className="text-[10.5px] text-ry-ink-soft">{recurrenceLabel(b)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-[12px] text-ry-ink">
                  <div className="inline-flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-ry-ink-soft" />{" "}
                    {staffLabel(group, staffNames, staff.length)}
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-ry-ink-soft" />{" "}
                    {formatDate(b.startDateTime)}
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-ry-ink-soft" />{" "}
                    {timeRangeLabel(b.startDateTime, b.endDateTime)}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="h-8 flex-1 rounded-[10px] text-[11.5px]"
                    onClick={() => setEditing(group)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleRemove(group)}
                    className="h-8 flex-1 rounded-[10px] border-danger/40 text-[11.5px] text-danger hover:bg-danger-bg"
                  >
                    {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                    Remover
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Keyed so switching cards remounts the form instead of keeping stale state. */}
      {editing && (
        <NovoBloqueioDialog
          key={editing.key}
          group={editing}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}
    </>
  );
}

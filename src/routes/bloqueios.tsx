import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Ban, Calendar, Clock, User } from "lucide-react";
import { useMemo } from "react";
import { useStaffList } from "@/lib/api/hooks/staff";
import { useAllTimeBlocks } from "@/lib/api/hooks/timeblocks";
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

function timeRange(start: string, end: string): string {
  const s = start.slice(11, 16);
  const e = end.slice(11, 16);
  if (!s || !e) return "—";
  if (s === "00:00" && e === "00:00") return "Dia inteiro";
  return `${s} – ${e}`;
}

function BloqueiosPage() {
  const staffQuery = useStaffList({ size: 200 });
  const staff = staffQuery.data?.content ?? [];
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const { blocks, isLoading, isError, error, refetch } = useAllTimeBlocks(staffIds);

  const loading = staffQuery.isLoading || isLoading;

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Bloqueios"]}
        title="Bloqueios"
        subtitle="Períodos indisponíveis na agenda: pausas, folgas e feriados"
        actions={
          <Button className="rounded-[10px] gap-2 bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]">
            <Plus className="h-3.5 w-3.5" /> Novo bloqueio
          </Button>
        }
      />

      {loading ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <LoadingState />
        </Card>
      ) : isError || staffQuery.isError ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : blocks.length === 0 ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <EmptyState label="Nenhum bloqueio cadastrado." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {blocks.map((b) => (
            <Card key={`${b.staffId}-${b.id}`} className="rounded-[14px] border-ry-line p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#EDF0F7] text-ry-ink-soft">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <b className="block text-[13px] font-medium">{b.reason || b.type}</b>
                  <span className="text-[10.5px] text-ry-ink-soft">
                    {b.isRecurring ? "Recorrente" : "Único"}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-[12px] text-ry-ink">
                <div className="inline-flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-ry-ink-soft" />{" "}
                  {staffMap.get(b.staffId)?.name ?? `Profissional #${b.staffId}`}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-ry-ink-soft" /> {formatDate(b.startDateTime)}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-ry-ink-soft" />{" "}
                  {timeRange(b.startDateTime, b.endDateTime)}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-[10px] text-[11.5px] h-8">Editar</Button>
                <Button variant="outline" className="flex-1 rounded-[10px] text-[11.5px] h-8 text-danger border-danger/40 hover:bg-danger-bg">
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

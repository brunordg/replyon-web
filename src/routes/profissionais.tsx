import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NovoProfissionalDialog } from "@/components/novo-profissional-dialog";
import { EditarProfissionalDialog } from "@/components/editar-profissional-dialog";
import { useStaffList } from "@/lib/api/hooks/staff";
import { colorFromString, initials } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import { Clock, Star } from "lucide-react";
import type { StaffResponse } from "@/lib/api/types";

export const Route = createFileRoute("/profissionais")({
  component: ProfissionaisPage,
  head: () => ({
    meta: [
      { title: "Profissionais — Replyon" },
      { name: "description", content: "Equipe, especialidades e agenda por profissional." },
    ],
  }),
});

function ProfissionaisPage() {
  const { data, isLoading, isError, error, refetch } = useStaffList();
  const staff = data?.content ?? [];

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Profissionais"]}
        title="Profissionais"
        subtitle="Equipe, especialidades, avaliações e ocupação"
        actions={<NovoProfissionalDialog />}
      />

      {isLoading ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <LoadingState />
        </Card>
      ) : isError ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : staff.length === 0 ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <EmptyState label="Nenhum profissional cadastrado." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {staff.map((p) => (
            <ProfissionalCard key={p.id} staff={p} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * The week/rating/occupancy metrics are not exposed by the API yet, so the
 * tiles render an em dash placeholder rather than a stand-in number — a fake
 * occupancy rate would be indistinguishable from a real one.
 */
function ProfissionalCard({ staff }: { staff: StaffResponse }) {
  return (
    <Card className="rounded-[14px] border-ry-line p-5">
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-white"
          style={{ background: colorFromString(staff.name) }}
        >
          {initials(staff.name)}
        </div>
        <div className="min-w-0">
          <b className="block truncate text-[13px] font-medium">{staff.name}</b>
          <span className="block truncate text-[11px] text-ry-ink-soft">
            {staff.specialties.length > 0 ? staff.specialties.join(" · ") : "Sem especialidades"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat value="—" label="Semana" />
        <Stat value="—" label="Avaliação" icon={<Star className="h-3 w-3 text-ry-ink-soft" />} />
        <Stat value="—" label="Ocupação" />
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-ry-line"
        role="progressbar"
        aria-label="Ocupação"
        aria-valuetext="Sem dados"
      />

      <div className="mt-4 flex gap-2">
        <EditarProfissionalDialog
          staff={staff}
          defaultTab="horarios"
          trigger={
            <Button variant="outline" className="h-8 flex-1 rounded-[10px] text-[11.5px]">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Agenda
            </Button>
          }
        />
        <EditarProfissionalDialog staff={staff} />
      </div>
    </Card>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[17px] font-semibold leading-none">
        {value}
        {icon}
      </div>
      <div className="mt-1 text-[10.5px] text-ry-ink-soft">{label}</div>
    </div>
  );
}

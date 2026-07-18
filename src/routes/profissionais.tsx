import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NovoProfissionalDialog } from "@/components/novo-profissional-dialog";
import { EditarProfissionalDialog } from "@/components/editar-profissional-dialog";
import { useStaffList } from "@/lib/api/hooks/staff";
import { ENTITY_STATUS_LABEL, ENTITY_STATUS_STYLE } from "@/lib/api/status";
import { colorFromString, initials } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";

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
        subtitle="Equipe, especialidades e status"
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
            <Card key={p.id} className="rounded-[14px] border-ry-line p-5">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-full text-[15px] font-semibold text-white"
                  style={{ background: colorFromString(p.name) }}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0">
                  <b className="block text-[13px] font-medium">{p.name}</b>
                  <span className="text-[11px] text-ry-ink-soft truncate block">
                    {p.specialties.length > 0 ? p.specialties.join(" · ") : "Sem especialidades"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-1.5 text-[11.5px] text-ry-ink-soft">
                <span className="truncate">{p.email}</span>
                <span>{p.phone || "—"}</span>
              </div>

              <div className="mt-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-medium ${ENTITY_STATUS_STYLE[p.status]}`}>
                  {ENTITY_STATUS_LABEL[p.status]}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-[10px] text-[11.5px] h-8">Ver agenda</Button>
                <EditarProfissionalDialog staff={p} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

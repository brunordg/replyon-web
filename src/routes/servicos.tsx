import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Clock, Search, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { NovoServicoDialog } from "@/components/novo-servico-dialog";
import { EditarServicoDialog } from "@/components/editar-servico-dialog";
import { useServices } from "@/lib/api/hooks/services";
import { formatBRL } from "@/lib/utils";
import { ENTITY_STATUS_LABEL } from "@/lib/api/status";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";

export const Route = createFileRoute("/servicos")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    return q ? { q } : {};
  },
  component: ServicosPage,
  head: () => ({
    meta: [
      { title: "Serviços — Replyon" },
      { name: "description", content: "Catálogo de serviços, duração e preços." },
    ],
  }),
});

function ServicosPage() {
  const { q } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");

  useEffect(() => {
    setSearch(q ?? "");
  }, [q]);

  const name = useDebouncedValue(search).trim() || undefined;
  const { data, isLoading, isError, error, refetch } = useServices({ name });
  const services = data?.content ?? [];

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Serviços"]}
        title="Serviços"
        subtitle="Catálogo, tempo e valores"
        actions={<NovoServicoDialog />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="rounded-full border border-ry-blue-500 bg-ry-blue-50 px-3 py-1.5 text-[11px] font-medium text-ry-blue-600">
          Todos
        </button>
        <div className="ml-auto flex items-center gap-2.5 rounded-[10px] border border-ry-line bg-white px-3 py-1.5 min-w-[260px]">
          <Search className="h-3.5 w-3.5 text-ry-ink-soft" />
          <input
            className="flex-1 border-0 bg-transparent text-[12px] outline-none"
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <LoadingState />
        </Card>
      ) : isError ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : services.length === 0 ? (
        <Card className="rounded-[14px] border-ry-line p-0">
          <EmptyState label={name ? "Nenhum serviço encontrado." : "Nenhum serviço cadastrado."} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="rounded-[14px] border-ry-line p-5">
              <div className="flex items-start justify-between">
                <div>
                  <b className="block text-[14px] font-medium">{s.name}</b>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[10.5px] text-ry-ink-soft">
                    <Tag className="h-3 w-3" /> {s.description || ENTITY_STATUS_LABEL[s.status]}
                  </span>
                </div>
                <div className="font-display text-[18px] font-medium text-ry-blue-600">
                  {formatBRL(s.price)}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11.5px] text-ry-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {s.durationMinutes} minutos
                </span>
                <EditarServicoDialog service={s} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

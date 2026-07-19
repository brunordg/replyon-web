import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Search, Phone, Mail, Power, PowerOff, Loader2 } from "lucide-react";
import { NovoClienteDialog } from "@/components/novo-cliente-dialog";
import { EditarClienteDialog } from "@/components/editar-cliente-dialog";
import { useCustomers, useSetCustomerStatus } from "@/lib/api/hooks/customers";
import { ENTITY_STATUS_LABEL, ENTITY_STATUS_STYLE } from "@/lib/api/status";
import { colorFromString, initials } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CustomerResponse } from "@/lib/api/types";

export const Route = createFileRoute("/clientes")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    // Returning {} rather than { q: undefined } keeps "?q=" out of the URL.
    return q ? { q } : {};
  },
  component: ClientesPage,
  head: () => ({
    meta: [
      { title: "Clientes — Replyon" },
      { name: "description", content: "Base de clientes com histórico e contato." },
    ],
  }),
});

function ClientesPage() {
  const { q } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");

  // Searching again from the top bar while already on this page updates the
  // search param without remounting, so the input has to follow it.
  useEffect(() => {
    setSearch(q ?? "");
  }, [q]);

  const name = useDebouncedValue(search).trim() || undefined;

  const { data, isLoading, isError, error, refetch } = useCustomers({ name });
  const customers = data?.content ?? [];

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Clientes"]}
        title="Clientes"
        subtitle="Sua base de clientes, histórico e canais de contato"
        actions={<NovoClienteDialog />}
      />

      <Card className="rounded-[14px] border-ry-line overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-ry-line px-4 py-3.5">
          <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
            Todos os clientes
          </span>
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
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : customers.length === 0 ? (
          <EmptyState label="Nenhum cliente encontrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  {["Cliente", "Telefone", "Visitas", "Última visita", "Segmento", "Ações"].map(
                    (h) => (
                      <th
                        key={h}
                        className="border-b border-ry-line bg-ry-blue-50 px-4 py-3 text-left font-display text-[10.5px] font-medium uppercase tracking-[1.5px] text-ry-ink-soft whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFBFE]">
                    <td className="border-b border-ry-line px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: colorFromString(c.name) }}
                        >
                          {initials(c.name)}
                        </div>
                        <div>
                          <b className="block text-[12px] font-medium">{c.name}</b>
                          <span className="text-[10.5px] text-ry-ink-soft inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {c.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-ry-line px-4 py-3 text-[12px] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-ry-ink-soft" /> {c.phone || "—"}
                      </span>
                    </td>
                    <td className="border-b border-ry-line px-4 py-3 text-[12px] font-medium whitespace-nowrap">
                      —
                    </td>
                    <td className="border-b border-ry-line px-4 py-3 text-[12px] whitespace-nowrap">
                      —
                    </td>
                    <td className="border-b border-ry-line px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-medium ${ENTITY_STATUS_STYLE[c.status]}`}
                      >
                        {ENTITY_STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="border-b border-ry-line px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        <EditarClienteDialog customer={c} />
                        <ClienteStatusButton customer={c} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function ClienteStatusButton({ customer }: { customer: CustomerResponse }) {
  const setStatus = useSetCustomerStatus();
  const active = customer.status === "ACTIVE";
  const Icon = active ? PowerOff : Power;

  return (
    <button
      title={active ? "Desativar" : "Ativar"}
      disabled={setStatus.isPending}
      onClick={() => setStatus.mutate({ id: customer.id, active: !active })}
      className={`grid h-7 w-7 place-items-center rounded-lg border bg-white transition-colors disabled:opacity-40 ${
        active
          ? "border-ry-line text-ry-ink-soft hover:border-danger hover:text-danger"
          : "border-ry-line text-ry-ink-soft hover:border-ok hover:text-ok"
      }`}
    >
      {setStatus.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

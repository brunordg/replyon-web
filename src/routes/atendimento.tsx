import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ConversationThreadPane } from "@/components/conversation-thread-pane";
import { useHandoffConversations } from "@/lib/api/hooks/conversations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atendimento")({
  component: AtendimentoPage,
  head: () => ({
    meta: [
      { title: "Atendimento — Replyon" },
      { name: "description", content: "Conversas do WhatsApp aguardando atendimento humano." },
    ],
  }),
});

function AtendimentoPage() {
  const { data, isLoading } = useHandoffConversations(10_000);
  const handoffs = data ?? [];
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const selected = handoffs.find((h) => h.phone === selectedPhone) ?? null;

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Atendimento"]}
        title="Atendimento"
        subtitle="Conversas do WhatsApp aguardando um atendente"
      />

      <Card
        className="grid grid-cols-1 overflow-hidden rounded-[14px] border-ry-line p-0 sm:grid-cols-[300px_1fr]"
        style={{ height: "calc(100vh - 220px)", minHeight: 480 }}
      >
        <div className="flex min-h-0 flex-col overflow-hidden border-b border-ry-line sm:border-b-0 sm:border-r">
          <div className="border-b border-ry-line px-4 py-3">
            <span className="font-display text-[12px] font-medium uppercase tracking-[1px]">
              {handoffs.length} aguardando
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-[12px] text-ry-ink-soft">Carregando…</div>
            ) : handoffs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-ry-ink-soft">
                <MessageCircle className="h-6 w-6 opacity-40" />
                <p className="text-[12px]">Nenhuma conversa aguardando atendimento.</p>
              </div>
            ) : (
              <ul>
                {handoffs.map((h) => (
                  <li key={h.phone}>
                    <button
                      onClick={() => setSelectedPhone(h.phone)}
                      className={cn(
                        "w-full border-b border-ry-line px-4 py-3 text-left transition-colors",
                        h.phone === selectedPhone ? "bg-ry-blue-50" : "hover:bg-ry-bg",
                      )}
                    >
                      <p className="truncate text-[12.5px] font-medium">{h.customerName || h.phone}</p>
                      {h.lastMessagePreview && (
                        <p className="mt-0.5 truncate text-[11px] text-ry-ink-soft">{h.lastMessagePreview}</p>
                      )}
                      {h.lastMessageAt && (
                        <p className="mt-0.5 text-[10px] text-ry-ink-soft">
                          {formatDistanceToNow(new Date(h.lastMessageAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <ConversationThreadPane
          phone={selectedPhone}
          customerId={selected?.customerId}
          customerName={selected?.customerName}
          onResolved={() => setSelectedPhone(null)}
        />
      </Card>
    </>
  );
}

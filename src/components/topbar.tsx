import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Loader2, Mail, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth/auth-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { MIN_SEARCH_LENGTH, useGlobalSearch } from "@/lib/api/hooks/search";
import { useNotifications } from "@/lib/api/hooks/notifications";
import { useHandoffConversations } from "@/lib/api/hooks/conversations";
import { ENTITY_STATUS_LABEL, ENTITY_STATUS_STYLE } from "@/lib/api/status";
import { cn, colorFromString, initials } from "@/lib/utils";
import type { SearchHit } from "@/lib/api/types";

/** Para onde cada tipo de resultado te leva, com o termo levado adiante como filtro. */
const DESTINATION = {
  customers: { to: "/clientes", heading: "Clientes", all: "Ver todos os clientes" },
  staff: { to: "/profissionais", heading: "Profissionais", all: "Ver todos os profissionais" },
  services: { to: "/servicos", heading: "Serviços", all: "Ver todos os serviços" },
} as const;

type ResultKind = keyof typeof DESTINATION;
/** Mantido como literais para que o router valide o tipo do destino e seu parâmetro de busca. */
type Destination = (typeof DESTINATION)[ResultKind]["to"];

export function Topbar() {
  const { user } = useAuth();
  const avatarChar = (user?.email?.[0] ?? "R").toUpperCase();

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const query = useDebouncedValue(term, 350).trim();

  const { data, isFetching, isError } = useGlobalSearch(query, open);

  const { data: notificationsData } = useNotifications();
  const notifications = notificationsData ?? [];
  const recentCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return notifications.filter((n) => new Date(n.createdAt).getTime() >= dayAgo).length;
  }, [notifications]);

  const { data: handoffsData } = useHandoffConversations();
  const handoffCount = handoffsData?.length ?? 0;

  // Ctrl/⌘+K a partir de qualquer lugar. Seguro vincular uma única vez: Topbar
  // é montado uma única vez no AppShell, acima do outlet do router.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(to: Destination) {
    setOpen(false);
    setTerm("");
    navigate({ to, search: { q: query } });
  }

  const tooShort = query.length < MIN_SEARCH_LENGTH;
  const groups: ResultKind[] = ["customers", "staff", "services"];
  const hasResults = !!data && groups.some((kind) => data[kind].length > 0);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ry-line bg-card px-4 md:px-7 py-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 flex-1 max-w-[380px] rounded-[10px] border border-ry-line bg-ry-bg px-3.5 py-2 text-ry-ink-soft hover:border-ry-blue-500 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left text-[12.5px]">Buscar por nome…</span>
        <kbd className="hidden sm:inline rounded border border-ry-line bg-white px-1.5 py-0.5 text-[10px] font-medium">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar cliente, profissional ou serviço pelo nome…"
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          {tooShort ? (
            <CommandEmpty>Digite ao menos {MIN_SEARCH_LENGTH} caracteres para buscar.</CommandEmpty>
          ) : isError ? (
            <CommandEmpty>Não foi possível buscar. Tente novamente.</CommandEmpty>
          ) : !hasResults ? (
            <CommandEmpty>
              {isFetching ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
                </span>
              ) : (
                `Nenhum resultado para "${query}".`
              )}
            </CommandEmpty>
          ) : (
            groups.map((kind) => {
              const hits = data![kind];
              if (hits.length === 0) return null;
              return (
                <CommandGroup key={kind} heading={DESTINATION[kind].heading}>
                  {hits.map((hit) => (
                    <ResultItem
                      key={hit.id}
                      kind={kind}
                      hit={hit}
                      onSelect={() => go(DESTINATION[kind].to)}
                    />
                  ))}
                  {/* A API limita cada tipo, então não há sinal de que existem mais —
                      este é esse sinal, e não custa nenhuma chamada extra. */}
                  <CommandItem
                    value={`${kind}-all`}
                    onSelect={() => go(DESTINATION[kind].to)}
                    className="text-[11.5px] text-ry-blue-600"
                  >
                    {DESTINATION[kind].all}
                  </CommandItem>
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </CommandDialog>

      <div className="ml-auto flex items-center gap-3.5">
        <button
          onClick={() => navigate({ to: "/atendimento" })}
          title="Atendimento"
          className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-ry-line bg-card text-ry-ink-soft hover:border-ry-blue-500 hover:text-ry-blue-600 transition-colors"
        >
          <Mail className="h-4 w-4" />
          {handoffCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full border-2 border-white bg-ry-accent px-1 text-[9px] font-semibold text-white">
              {handoffCount > 9 ? "9+" : handoffCount}
            </span>
          )}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-ry-line bg-card text-ry-ink-soft hover:border-ry-blue-500 hover:text-ry-blue-600 transition-colors">
              <Bell className="h-4 w-4" />
              {recentCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full border-2 border-white bg-ry-accent px-1 text-[9px] font-semibold text-white">
                  {recentCount > 9 ? "9+" : recentCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-ry-line px-4 py-3">
              <span className="font-display text-[13px] font-medium uppercase tracking-[1px]">
                Notificações
              </span>
              <p className="text-[11px] text-ry-ink-soft">Eventos automáticos via WhatsApp</p>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-ry-ink-soft">
                Nenhuma notificação recente.
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="border-b border-ry-line px-4 py-3 last:border-0">
                    <p className="text-[12.5px]">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-ry-ink-soft">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>
        <div
          className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--ry-blue-500), var(--ry-blue-900))",
          }}
        >
          {avatarChar}
        </div>
      </div>
    </header>
  );
}

function ResultItem({
  kind,
  hit,
  onSelect,
}: {
  kind: ResultKind;
  hit: SearchHit;
  onSelect: () => void;
}) {
  return (
    // O value precisa ser único entre os grupos: nomes colidem entre tipos e
    // o cmdk indexa sua seleção pelo value.
    <CommandItem value={`${kind}-${hit.id}`} onSelect={onSelect} className="gap-2.5">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
        style={{ background: colorFromString(hit.name) }}
      >
        {initials(hit.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] text-ry-ink">{hit.name}</span>
        {hit.subtitle && (
          <span className="block truncate text-[11px] text-ry-ink-soft">{hit.subtitle}</span>
        )}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
          ENTITY_STATUS_STYLE[hit.status],
        )}
      >
        {ENTITY_STATUS_LABEL[hit.status]}
      </span>
    </CommandItem>
  );
}

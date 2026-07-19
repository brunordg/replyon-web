import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Loader2, Mail, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { MIN_SEARCH_LENGTH, useGlobalSearch } from "@/lib/api/hooks/search";
import { ENTITY_STATUS_LABEL, ENTITY_STATUS_STYLE } from "@/lib/api/status";
import { cn, colorFromString, initials } from "@/lib/utils";
import type { SearchHit } from "@/lib/api/types";

/** Where each result type sends you, with the term carried over as a filter. */
const DESTINATION = {
  customers: { to: "/clientes", heading: "Clientes", all: "Ver todos os clientes" },
  staff: { to: "/profissionais", heading: "Profissionais", all: "Ver todos os profissionais" },
  services: { to: "/servicos", heading: "Serviços", all: "Ver todos os serviços" },
} as const;

type ResultKind = keyof typeof DESTINATION;
/** Kept as literals so the router type-checks the destination and its search param. */
type Destination = (typeof DESTINATION)[ResultKind]["to"];

export function Topbar() {
  const { user } = useAuth();
  const avatarChar = (user?.email?.[0] ?? "R").toUpperCase();

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const query = useDebouncedValue(term, 350).trim();

  const { data, isFetching, isError } = useGlobalSearch(query, open);

  // Ctrl/⌘+K from anywhere. Safe to bind once: Topbar mounts a single time in
  // AppShell, above the router outlet.
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
                  {/* The API caps each type, so there is no signal that more
                      exist — this is that signal, and it costs no extra call. */}
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
        <button className="grid h-9 w-9 place-items-center rounded-[10px] border border-ry-line bg-card text-ry-ink-soft hover:border-ry-blue-500 hover:text-ry-blue-600 transition-colors">
          <Mail className="h-4 w-4" />
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-ry-line bg-card text-ry-ink-soft hover:border-ry-blue-500 hover:text-ry-blue-600 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 rounded-full border-2 border-white bg-ry-accent px-1 text-[9px] font-semibold text-white">
            3
          </span>
        </button>
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
    // The value must be unique across groups: names collide between types and
    // cmdk keys its selection by value.
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

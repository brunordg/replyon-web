import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { StaffResponse } from "@/lib/api/types";

export interface StaffFilterProps {
  staff: StaffResponse[];
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  /** Limita seleções simultâneas (ex.: o limite de colunas de um calendário). Omita para sem limite. */
  max?: number;
  /** Exibido acima da lista quando `max` está definido, explicando por que o limite existe. */
  capLabel?: string;
}

/**
 * Seleção múltipla de profissionais. Uma seleção vazia significa "todos" — quem
 * usa este componente decide o que isso implica para sua própria visão.
 */
export function StaffFilter({ staff, selected, onChange, max, capLabel }: StaffFilterProps) {
  const atLimit = max != null && selected.size >= max;

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (max == null || next.size < max) next.add(id);
    onChange(next);
  }

  const label =
    selected.size === 0
      ? "Todos profissionais"
      : selected.size === 1
        ? (staff.find((s) => selected.has(s.id))?.name ?? "1 selecionado")
        : `${selected.size} selecionados`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-8 min-w-[150px] items-center justify-between gap-2 rounded-lg border border-ry-line bg-white px-3 text-[11.5px] transition hover:border-ry-blue-500">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        {capLabel && (
          <>
            <DropdownMenuLabel className="text-[11px] font-normal text-ry-ink-soft">
              {capLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {staff.length === 0 ? (
          <div className="px-2 py-1.5 text-[11.5px] text-ry-ink-soft">
            Nenhum profissional ativo.
          </div>
        ) : (
          staff.map((s) => {
            const checked = selected.has(s.id);
            return (
              <DropdownMenuCheckboxItem
                key={s.id}
                checked={checked}
                // Bloquear os não marcados ao atingir o limite deixa a restrição óbvia
                // sem descartar silenciosamente uma escolha que o usuário acabou de fazer.
                disabled={!checked && atLimit}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggle(s.id)}
                className="text-[12px]"
              >
                {s.name}
              </DropdownMenuCheckboxItem>
            );
          })
        )}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              onClick={() => onChange(new Set())}
              className="w-full px-2 py-1.5 text-left text-[11.5px] text-ry-ink-soft transition hover:text-ry-blue-600"
            >
              Limpar seleção
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Texto secundário exibido em tom mais claro ao lado do rótulo. */
  hint?: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /**
   * Rótulo para o valor atual quando ele não está em `options`.
   *
   * No modo server-side a lista de opções é apenas a última página de resultados,
   * então o item escolhido geralmente não está nela — sem isso o gatilho ficaria
   * em branco assim que o usuário digitasse outra coisa.
   */
  valueLabel?: string;
  /**
   * Forneça isso para buscar no servidor: o componente para de filtrar localmente
   * e passa cada tecla digitada para quem chamou. Omita e o cmdk filtra as opções
   * fornecidas no navegador, o que é correto para listas curtas e já filtradas.
   */
  onSearchChange?: (search: string) => void;
  loading?: boolean;
}

/**
 * Select com busca incremental (type-ahead).
 *
 * Substitui um Select simples sempre que a lista é longa o bastante para que
 * rolar até um nome seja a parte lenta.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Buscar…",
  emptyLabel = "Nada encontrado.",
  disabled,
  valueLabel,
  onSearchChange,
  loading,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const serverSide = !!onSearchChange;
  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? valueLabel ?? "";

  function handleSearch(next: string) {
    setSearch(next);
    onSearchChange?.(next);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Reseta o filtro ao fechar para que reabrir nunca mostre um subconjunto desatualizado.
    if (!next) handleSearch("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-input bg-transparent px-3 py-2 text-[13px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !label && "text-muted-foreground",
          )}
        >
          <span className="truncate">{label || placeholder}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* No modo local o cmdk pode filtrar; no modo servidor não deve, ou filtraria
            a resposta do servidor uma segunda vez contra um input desatualizado. */}
        <Command shouldFilter={!serverSide}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onChange("");
                        handleOpenChange(false);
                      }}
                      className="text-ry-ink-soft"
                    >
                      Limpar seleção
                    </CommandItem>
                  )}
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      // O value permanece o id para que a seleção seja inequívoca quando
                      // duas pessoas compartilham um nome; `keywords` é o que o modo local
                      // realmente compara com o que foi digitado.
                      value={option.value}
                      keywords={[option.label, option.hint ?? ""]}
                      onSelect={() => {
                        onChange(option.value);
                        handleOpenChange(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          option.value === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                      {option.hint && (
                        <span className="ml-auto shrink-0 text-[11px] text-ry-ink-soft">
                          {option.hint}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

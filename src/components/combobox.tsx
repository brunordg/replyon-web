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
  /** Secondary text shown muted next to the label. */
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
   * Label for the current value when it is not in `options`.
   *
   * In server-side mode the option list is only the last page of results, so the
   * chosen item usually is not in it — without this the trigger would go blank
   * the moment the user types something else.
   */
  valueLabel?: string;
  /**
   * Provide this to search on the server: the component stops filtering locally
   * and hands every keystroke to the caller instead. Omit it and cmdk filters
   * the given options in the browser, which is right for short, already-filtered
   * lists.
   */
  onSearchChange?: (search: string) => void;
  loading?: boolean;
}

/**
 * Type-ahead select.
 *
 * Replaces a plain Select wherever the list is long enough that scrolling to a
 * name is the slow part.
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
    // Reset the filter on close so reopening never shows a stale subset.
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
        {/* Local mode lets cmdk filter; server mode must not, or it would filter
            the server's answer a second time against a stale input. */}
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
                      // The value stays the id so selection is unambiguous when
                      // two people share a name; `keywords` is what local mode
                      // actually matches the typing against.
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

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import { SCHEDULE_DAYS } from "@/lib/api/types";
import type { ScheduleDay } from "@/lib/api/types";
import {
  DAY_LABEL,
  WEEKDAYS,
  WEEKEND,
  buildWeek,
  fromMinutes,
  makeWindow,
  minutes,
  weeklyTotalHours,
  type DayState,
  type WeekState,
  type Window,
} from "@/lib/schedule-week";
import { cn } from "@/lib/utils";

/** Presets offered by "Aplicar modelo". */
const TEMPLATES: { label: string; hint: string; build: () => WeekState }[] = [
  {
    label: "Comercial com almoço",
    hint: "Seg–Sex · 09:00–12:00 e 13:00–18:00",
    build: () =>
      buildWeek(WEEKDAYS, [
        ["09:00", "12:00"],
        ["13:00", "18:00"],
      ]),
  },
  {
    label: "Comercial corrido",
    hint: "Seg–Sex · 09:00–18:00",
    build: () => buildWeek(WEEKDAYS, [["09:00", "18:00"]]),
  },
  {
    label: "Seg–Sáb com almoço",
    hint: "Seg–Sáb · 09:00–12:00 e 13:00–18:00",
    build: () =>
      buildWeek(
        [...WEEKDAYS, "saturday"],
        [
          ["09:00", "12:00"],
          ["13:00", "18:00"],
        ],
      ),
  },
  {
    label: "Somente manhãs",
    hint: "Seg–Sex · 08:00–12:00",
    build: () => buildWeek(WEEKDAYS, [["08:00", "12:00"]]),
  },
  {
    label: "Somente tardes",
    hint: "Seg–Sex · 13:00–19:00",
    build: () => buildWeek(WEEKDAYS, [["13:00", "19:00"]]),
  },
];

export function HorariosSemanais({
  week,
  onChange,
  errors,
}: {
  week: WeekState;
  onChange: (next: WeekState) => void;
  errors: Partial<Record<ScheduleDay, string>>;
}) {
  const total = useMemo(() => weeklyTotalHours(week), [week]);

  function patchDay(day: ScheduleDay, patch: Partial<DayState>) {
    onChange({ ...week, [day]: { ...week[day], ...patch } });
  }

  function patchWindow(day: ScheduleDay, id: string, patch: Partial<Window>) {
    patchDay(day, {
      windows: week[day].windows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });
  }

  function addWindow(day: ScheduleDay) {
    // Start the new window where the day currently ends, capped so it stays
    // inside the same day.
    const last = week[day].windows[week[day].windows.length - 1];
    const startMin = last && Number.isFinite(minutes(last.end)) ? minutes(last.end) : 9 * 60;
    const start = Math.min(startMin, 23 * 60);
    const end = Math.min(start + 120, 24 * 60 - 1);
    patchDay(day, {
      windows: [...week[day].windows, makeWindow(fromMinutes(start), fromMinutes(end))],
    });
  }

  function removeWindow(day: ScheduleDay, id: string) {
    const remaining = week[day].windows.filter((w) => w.id !== id);
    // Removing the last window closes the day rather than leaving it empty.
    if (remaining.length === 0) {
      onChange({ ...week, [day]: { enabled: false, windows: [makeWindow("09:00", "18:00")] } });
      return;
    }
    patchDay(day, { windows: remaining });
  }

  /** Copies one day's enabled state and windows onto the given targets. */
  function copyTo(source: ScheduleDay, targets: ScheduleDay[]) {
    const src = week[source];
    const next = { ...week };
    for (const target of targets) {
      if (target === source) continue;
      next[target] = {
        enabled: src.enabled,
        windows: src.windows.map((w) => makeWindow(w.start, w.end)),
      };
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-ry-ink-soft">
          Total semanal: <b className="font-semibold text-ry-ink">{total.toFixed(1)}h</b>
        </span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-8 rounded-[10px] text-[11.5px]">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Aplicar modelo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Aplicar modelo à semana</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TEMPLATES.map((t) => (
              <DropdownMenuItem
                key={t.label}
                onSelect={() => onChange(t.build())}
                className="flex-col items-start gap-0.5"
              >
                <span className="text-[12px]">{t.label}</span>
                <span className="text-[10.5px] text-ry-ink-soft">{t.hint}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {SCHEDULE_DAYS.map((day) => {
          const { enabled, windows } = week[day];
          return (
            <div
              key={day}
              className={cn(
                "rounded-[12px] border p-3 transition",
                enabled ? "border-ry-line" : "border-ry-line/60 bg-ry-line/10",
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex w-40 shrink-0 items-center gap-2.5 pt-1">
                  <Switch
                    id={`dia-${day}`}
                    checked={enabled}
                    onCheckedChange={(checked) => patchDay(day, { enabled: checked })}
                  />
                  <label htmlFor={`dia-${day}`} className="cursor-pointer">
                    <span className="block text-[12px] font-medium">{DAY_LABEL[day]}</span>
                    <span className="block text-[10.5px] text-ry-ink-soft">
                      {enabled
                        ? `${windows.length} ${windows.length === 1 ? "janela" : "janelas"}`
                        : "Não atende"}
                    </span>
                  </label>
                </div>

                {enabled && (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {windows.map((w) => (
                        <div key={w.id} className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            aria-label={`Início — ${DAY_LABEL[day]}`}
                            value={w.start}
                            onChange={(e) => patchWindow(day, w.id, { start: e.target.value })}
                            className="h-8 w-[104px] text-[12px]"
                          />
                          <span className="text-[11.5px] text-ry-ink-soft">–</span>
                          <Input
                            type="time"
                            aria-label={`Fim — ${DAY_LABEL[day]}`}
                            value={w.end}
                            onChange={(e) => patchWindow(day, w.id, { end: e.target.value })}
                            className="h-8 w-[104px] text-[12px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`Remover janela — ${DAY_LABEL[day]}`}
                            onClick={() => removeWindow(day, w.id)}
                            className="h-8 w-8 rounded-[8px] p-0 text-ry-ink-soft hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addWindow(day)}
                        className="h-7 rounded-[8px] text-[11px]"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Janela
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-7 rounded-[8px] text-[11px] text-ry-blue-600 hover:text-ry-blue-700"
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copiar
                            <ChevronDown className="ml-0.5 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Copiar {DAY_LABEL[day]} para…</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => copyTo(day, WEEKDAYS)}>
                            Dias úteis (Seg–Sex)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => copyTo(day, WEEKEND)}>
                            Fim de semana (Sáb–Dom)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => copyTo(day, [...SCHEDULE_DAYS])}>
                            Todos os dias
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {SCHEDULE_DAYS.filter((d) => d !== day).map((d) => (
                            <DropdownMenuItem key={d} onSelect={() => copyTo(day, [d])}>
                              {DAY_LABEL[d]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </div>

              {errors[day] && <p className="mt-1.5 text-[11px] text-danger">{errors[day]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

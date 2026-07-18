import { CalendarCheck, Sparkles, Users, Clock } from "lucide-react";

/**
 * Painel decorativo lateral usado nas telas de login/signup.
 * Mostra uma "prévia viva" da agenda com blocos flutuantes,
 * grid, gradiente Replyon e micro-cards animados.
 */
export function AuthShowcase() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--ry-blue-900)] via-[var(--ry-blue-700)] to-[var(--ry-blue-500)] text-white p-10">
      {/* grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* glow blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[var(--ry-accent)]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[var(--ry-blue-500)]/60 blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="font-logo text-2xl font-bold leading-none">replyon</div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/60 mt-1">
            Gestão inteligente
          </div>
        </div>
      </div>

      {/* Floating agenda mock */}
      <div className="relative z-10 my-8 flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md">
          {/* main card */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-widest text-white/70">
                Agenda de hoje
              </div>
              <div className="text-[11px] rounded-full bg-[var(--ry-accent)] px-2 py-0.5 font-semibold">
                18 hoje
              </div>
            </div>
            <div className="space-y-2">
              {[
                { t: "09:00", c: "Ana Souza", s: "Limpeza de pele", color: "bg-[var(--ok)]" },
                { t: "10:30", c: "Pedro Lima", s: "Corte masculino", color: "bg-[var(--info)]" },
                { t: "14:00", c: "Julia Prado", s: "Coloração", color: "bg-[var(--done)]" },
                { t: "16:00", c: "Vitória Luz", s: "Design de sobrancelha", color: "bg-[var(--warn)]" },
              ].map((e) => (
                <div
                  key={e.t}
                  className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15 transition"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${e.color}`} />
                  <span className="font-display text-sm tracking-wide w-14">{e.t}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.c}</div>
                    <div className="text-[11px] text-white/60 truncate">{e.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* floating chip 1 */}
          <div className="absolute -top-6 -right-4 rounded-xl bg-white text-[var(--ry-ink)] px-3 py-2 shadow-xl flex items-center gap-2 rotate-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ok-bg)] text-[var(--ok)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--ry-ink-soft)]">
                Ocupação
              </div>
              <div className="font-display text-sm">76%</div>
            </div>
          </div>

          {/* floating chip 2 */}
          <div className="absolute -bottom-6 -left-6 rounded-xl bg-white text-[var(--ry-ink)] px-3 py-2 shadow-xl flex items-center gap-2 -rotate-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--info-bg)] text-[var(--info)]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--ry-ink-soft)]">
                Novos clientes
              </div>
              <div className="font-display text-sm">+42 no mês</div>
            </div>
          </div>

          {/* floating chip 3 */}
          <div className="absolute top-1/2 -left-10 rounded-xl bg-[var(--ry-accent)] text-white px-3 py-2 shadow-xl flex items-center gap-2 -rotate-6">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold">Próximo em 12min</span>
          </div>
        </div>
      </div>

      {/* Footer quote */}
      <div className="relative z-10">
        <p className="font-display text-2xl leading-tight max-w-sm">
          "Menos planilhas. Mais clientes na cadeira."
        </p>
        <p className="text-xs text-white/60 mt-2">
          Junte-se a mais de 3.200 negócios que já usam a Replyon.
        </p>
      </div>
    </div>
  );
}

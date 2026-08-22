import { CalendarCheck, Clock, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

const highlights = [
  { icon: Sparkles, label: "Agenda sempre organizada" },
  { icon: Users, label: "Equipe e clientes em um só lugar" },
  { icon: Clock, label: "Horários sob controle" },
];

export function HeroSection() {
  const { isAuthenticated } = useAuth();
  const ctaTarget = isAuthenticated ? "/" : "/login";
  const ctaLabel = isAuthenticated ? "Ir para o Dashboard" : "Entrar agora";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--ry-blue-900)] via-[var(--ry-blue-700)] to-[var(--ry-blue-500)] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[var(--ry-accent)]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[var(--ry-blue-500)]/60 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center sm:px-12 sm:py-28 lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <span className="font-logo text-2xl font-bold leading-none">replyon</span>
        </div>

        <h1 className="font-display max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
          Agendamento e gestão de horários para o seu negócio de serviços
        </h1>

        <p className="max-w-2xl text-base text-white/80 sm:text-lg">
          A Replyon reúne, em um só lugar, a agenda da sua equipe, os serviços que você oferece e o
          histórico dos seus clientes — para você organizar horários e nunca mais perder um
          agendamento.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {highlights.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <Button asChild size="lg" variant="secondary" className="mt-4">
          <Link to={ctaTarget}>{ctaLabel}</Link>
        </Button>
      </div>
    </section>
  );
}

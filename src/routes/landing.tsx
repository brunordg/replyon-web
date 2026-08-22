import { createFileRoute } from "@tanstack/react-router";

import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PlanSection } from "@/components/landing/PlanSection";
import { StickyCtaBar } from "@/components/landing/StickyCtaBar";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Replyon — Agendamentos e gestão para o seu negócio" },
      {
        name: "description",
        content:
          "Conheça o Replyon: agendamento, gestão de profissionais, serviços e clientes em um só lugar.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div>
      <StickyCtaBar />
      <HeroSection />
      <FeaturesSection />
      <PlanSection />
    </div>
  );
}

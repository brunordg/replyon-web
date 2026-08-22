import { CalendarCheck, UserCog, Users, Clock, MessageCircle, type LucideIcon } from "lucide-react";

export interface PlanFeature {
  label: string;
}

export interface PlanContent {
  name: string;
  priceLabel: string;
  billingPeriodLabel: string;
  features: PlanFeature[];
}

/**
 * `name`, `priceLabel` e `billingPeriodLabel` são placeholders pendentes de
 * confirmação de negócio (Q1/Q2 em aberto em `.squad/features/002/plan.md`).
 */
export const plan: PlanContent = {
  name: "Plano Único",
  priceLabel: "R$ 49,90",
  billingPeriodLabel: "por mês",
  features: [
    { label: "Agendamento online para os seus clientes" },
    { label: "Gestão de profissionais e serviços" },
    { label: "Gestão de clientes" },
    { label: "Controle de horários e agendamentos" },
    { label: "WhatsApp Bot para agendamentos automáticos" },
  ],
};

export interface ProductFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const productFeatures: ProductFeature[] = [
  {
    icon: CalendarCheck,
    title: "Agendamento",
    description:
      "Seus clientes marcam horários online, sem trocas de mensagem para achar um horário livre.",
  },
  {
    icon: UserCog,
    title: "Gestão de profissionais e serviços",
    description: "Cadastre sua equipe, os serviços prestados e quem pode atender cada um deles.",
  },
  {
    icon: Users,
    title: "Gestão de clientes",
    description: "Mantenha o histórico e os dados dos seus clientes organizados em um só lugar.",
  },
  {
    icon: Clock,
    title: "Controle de horários e agendamentos",
    description:
      "Defina janelas de atendimento, bloqueios de agenda e acompanhe todos os agendamentos.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Bot para agendamentos automáticos",
    description: "Seus clientes agendam direto pelo WhatsApp, sem precisar de mais um aplicativo.",
  },
];

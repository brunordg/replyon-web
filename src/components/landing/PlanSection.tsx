import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { plan } from "@/lib/content/plan";

export function PlanSection() {
  const { isAuthenticated } = useAuth();
  const ctaTarget = isAuthenticated ? "/" : "/login";

  return (
    <section id="plano" className="mx-auto max-w-5xl px-6 py-16 sm:px-12 sm:py-24 lg:px-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-bold text-ry-ink sm:text-3xl">
          Um plano único, sem complicação
        </h2>
        <p className="mt-3 text-base text-ry-ink-soft sm:text-lg">
          Tudo o que o seu negócio precisa para organizar a agenda em uma única assinatura.
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-md border-ry-blue-100">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-display text-xl text-ry-ink">{plan.name}</CardTitle>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="font-display text-4xl font-bold text-ry-ink">{plan.priceLabel}</span>
            <span className="text-sm text-ry-ink-soft">{plan.billingPeriodLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {plan.features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3 text-sm text-ry-ink-soft">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ry-blue-600" />
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button asChild size="lg" className="w-full">
            <Link to={ctaTarget}>Começar agora</Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

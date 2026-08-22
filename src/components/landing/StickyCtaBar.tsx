import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export function StickyCtaBar() {
  const { isAuthenticated } = useAuth();
  const ctaTarget = isAuthenticated ? "/" : "/login";
  const ctaLabel = isAuthenticated ? "Ir para o Dashboard" : "Entrar";

  return (
    <div className="sticky top-0 z-40 border-b border-ry-blue-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-12 lg:px-16">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 shrink-0 text-ry-blue-700" />
          <span className="hidden font-logo text-lg font-bold text-ry-ink sm:inline">replyon</span>
        </div>
        <Button asChild size="sm">
          <Link to={ctaTarget}>{ctaLabel}</Link>
        </Button>
      </div>
    </div>
  );
}

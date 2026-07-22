import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthShowcase } from "@/components/auth-showcase";
import { Mail, Lock, Eye, EyeOff, ArrowRight, CalendarCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Replyon" },
      { name: "description", content: "Acesse sua conta Replyon e gerencie sua agenda." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === 401
          ? "E-mail ou senha inválidos"
          : err instanceof ApiError
            ? err.message
            : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      <AuthShowcase />

      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 relative">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <span className="font-logo text-2xl font-bold text-primary">replyon</span>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ry-blue-50)] px-3 py-1 text-xs font-medium text-[var(--ry-blue-700)] mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
            Sistema online
          </div>

          <h1 className="font-display text-4xl font-medium text-foreground">
            BEM-VINDO DE VOLTA
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre e continue de onde parou. Sua agenda está te esperando.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <a href="#" className="text-xs font-medium text-primary hover:underline">
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="remember" />
              <span>Manter conectado por 30 dias</span>
            </label>

            <Button type="submit" className="w-full h-11 group" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou continue com
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="h-11 hidden">
                <GoogleIcon /> Google
              </Button>
              <Button type="button" variant="outline" className="h-11 hidden">
                <AppleIcon /> Apple
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.22-1.11 3-.71.83-1.87 1.47-2.99 1.38-.14-1.1.42-2.24 1.09-2.98.75-.83 2-1.44 3.01-1.4zM20.5 17.02c-.55 1.27-.81 1.84-1.52 2.97-.98 1.57-2.37 3.53-4.09 3.54-1.53.02-1.93-1-4-.99-2.07.01-2.51.99-4.04.98-1.72-.02-3.03-1.79-4.02-3.36C.4 15.16-.09 9.9 2.63 7.05c1-1.05 2.44-1.72 3.9-1.72 1.61 0 2.62.88 3.95.88 1.29 0 2.08-.89 3.94-.89 1.44 0 2.96.78 4.05 2.13-3.56 1.95-2.98 7.03.03 8.57z" />
    </svg>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShowcase } from "@/components/auth-showcase";
import {
  Mail, Lock, User, Building2, FileText, Phone, Eye, EyeOff, ArrowRight, ArrowLeft,
  Check, CalendarCheck, Scissors, Stethoscope, Dumbbell, Sparkles as Spark, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { companiesApi } from "@/lib/api/companies";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — Replyon" },
      { name: "description", content: "Crie sua conta Replyon em menos de 1 minuto." },
    ],
  }),
  component: SignupPage,
});

const segments = [
  { id: "beleza", label: "Beleza & Estética", icon: Scissors, hint: "Salão, barbearia, estúdio" },
  { id: "saude", label: "Saúde & Bem-estar", icon: Stethoscope, hint: "Clínica, terapia, spa" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, hint: "Personal, estúdio, pilates" },
  { id: "outros", label: "Outros serviços", icon: Spark, hint: "Consultoria, oficina, etc." },
] as const;

function SignupPage() {
  const [step, setStep] = useState(1);
  const [segment, setSegment] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  // Fields collected across the wizard. `name` is a personal name (cosmetic —
  // the signup endpoint has no field for it); the rest map to SignUpRequest.
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const strength = useMemo(() => scorePassword(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    try {
      await companiesApi.signup({
        companyName,
        companyDocument,
        companyEmail: email,
        companyPhone,
        adminEmail: email,
        adminPassword: password,
      });
      // Auto-login with the just-created admin credentials.
      await login(email, password);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível criar a conta. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      <AuthShowcase />

      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 relative">
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <span className="font-logo text-2xl font-bold text-primary">replyon</span>
        </div>

        <div className="mx-auto w-full max-w-md">
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    s <= step ? "bg-primary" : "bg-border",
                  )}
                />
                <div
                  className={cn(
                    "mt-2 text-[10px] uppercase tracking-widest font-semibold",
                    s <= step ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {s === 1 ? "Segmento" : s === 2 ? "Você" : "Acesso"}
                </div>
              </div>
            ))}
          </div>

          <h1 className="font-display text-4xl font-medium text-foreground">
            {step === 1 && "VAMOS COMEÇAR"}
            {step === 2 && "SOBRE VOCÊ"}
            {step === 3 && "QUASE LÁ"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1 && "Qual segmento descreve melhor seu negócio?"}
            {step === 2 && "Precisamos de alguns dados para personalizar sua conta."}
            {step === 3 && "Defina seu acesso e comece a agendar agora mesmo."}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {segments.map((seg) => {
                  const Icon = seg.icon;
                  const active = segment === seg.id;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setSegment(seg.id)}
                      className={cn(
                        "group relative rounded-xl border p-4 text-left transition-all hover:shadow-md",
                        active
                          ? "border-primary bg-[var(--ry-blue-50)] shadow-sm"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg mb-3",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-[var(--ry-blue-50)] text-primary",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">{seg.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{seg.hint}</div>
                      {active && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Seu nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Como podemos te chamar?"
                      className="pl-9 h-11"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Nome do negócio</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Ex: Studio Bella"
                      className="pl-9 h-11"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="document">CNPJ / CPF</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="document"
                        placeholder="00.000.000/0000-00"
                        className="pl-9 h-11"
                        value={companyDocument}
                        onChange={(e) => setCompanyDocument(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="(11) 90000-0000"
                        className="pl-9 h-11"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email2"
                      type="email"
                      placeholder="voce@empresa.com"
                      className="pl-9 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Crie uma senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pw"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="pl-9 pr-10 h-11"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < strength.score
                            ? strength.color
                            : "bg-border",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{strength.label}</p>
                </div>

                <div className="rounded-lg bg-[var(--ry-blue-50)] p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">14 dias grátis, sem cartão</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Cancele quando quiser. Todos os recursos liberados.
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ao criar sua conta você concorda com os{" "}
                  <a href="#" className="text-primary hover:underline">Termos</a> e a{" "}
                  <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
                </p>
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
              )}
              <Button
                type="submit"
                className="h-11 flex-1 group"
                disabled={(step === 1 && !segment) || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Criando conta…
                  </>
                ) : (
                  <>
                    {step < 3 ? "Continuar" : "Criar minha conta"}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Muito fraca", color: "bg-border" },
    { label: "Fraca", color: "bg-[var(--danger)]" },
    { label: "Razoável", color: "bg-[var(--warn)]" },
    { label: "Boa", color: "bg-[var(--info)]" },
    { label: "Forte", color: "bg-[var(--ok)]" },
  ];
  return { score, ...map[score] };
}

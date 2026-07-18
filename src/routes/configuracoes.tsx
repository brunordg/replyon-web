import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Bell, Lock, Clock, Loader2 } from "lucide-react";
import { useMyCompany, useUpdateCompany } from "@/lib/api/hooks/companies";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({
    meta: [
      { title: "Configurações — Replyon" },
      { name: "description", content: "Ajustes da empresa, horário e preferências." },
    ],
  }),
});

const SECTIONS = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "horario", label: "Horário", icon: Clock },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "seguranca", label: "Segurança", icon: Lock },
];

function ConfigPage() {
  const { data: company, isLoading } = useMyCompany();
  const updateCompany = useUpdateCompany();

  // Company form, seeded from the fetched company. `document` is read-only
  // (the backend does not allow updating it); `address` has no backend field.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setEmail(company.email);
      setPhone(company.phone);
    }
  }, [company]);

  const handleSave = () => {
    if (!company) return;
    updateCompany.mutate({ id: company.id, body: { name, email, phone } });
  };

  return (
    <>
      <PageHeader
        crumbs={["Dashboard", "Configurações"]}
        title="Configurações"
        subtitle="Ajustes gerais da conta, horário de atendimento e preferências"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="rounded-[14px] border-ry-line p-2 h-fit">
          <ul>
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12.5px] ${
                      i === 0
                        ? "bg-ry-blue-50 text-ry-blue-600 font-medium"
                        : "text-ry-ink-soft hover:bg-ry-bg"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card id="empresa" className="rounded-[14px] border-ry-line p-6">
            <div className="mb-4">
              <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
                Dados da empresa
              </span>
              <p className="text-[11.5px] text-ry-ink-soft">Informações que aparecem para seus clientes</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[11.5px]">Nome fantasia</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isLoading ? "Carregando…" : ""}
                  className="mt-1.5 rounded-[10px]"
                />
              </div>
              <div>
                <Label className="text-[11.5px]">CNPJ</Label>
                <Input
                  value={company?.document ?? ""}
                  disabled
                  className="mt-1.5 rounded-[10px]"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11.5px]">Endereço</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Endereço (não sincronizado com o backend)"
                  className="mt-1.5 rounded-[10px]"
                />
              </div>
              <div>
                <Label className="text-[11.5px]">Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 rounded-[10px]"
                />
              </div>
              <div>
                <Label className="text-[11.5px]">E-mail</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 rounded-[10px]"
                />
              </div>
            </div>
          </Card>

          <Card id="horario" className="rounded-[14px] border-ry-line p-6">
            <div className="mb-4">
              <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
                Horário de atendimento
              </span>
              <p className="text-[11.5px] text-ry-ink-soft">Defina os dias e horários em que a agenda é aberta</p>
            </div>
            <div className="space-y-2">
              {[
                ["Segunda", "08:00", "18:00", true],
                ["Terça", "08:00", "18:00", true],
                ["Quarta", "08:00", "18:00", true],
                ["Quinta", "08:00", "18:00", true],
                ["Sexta", "08:00", "19:00", true],
                ["Sábado", "08:00", "14:00", true],
                ["Domingo", "—", "—", false],
              ].map((row) => {
                const [dia, ini, fim, ativo] = row as [string, string, string, boolean];
                return (
                  <div
                    key={dia}
                    className="flex items-center gap-3 border-b border-ry-line py-2 last:border-0"
                  >
                    <div className="w-24 text-[12px] font-medium">{dia}</div>
                    <Switch defaultChecked={ativo} />
                    <div className="ml-auto flex items-center gap-2 text-[12px]">
                      <Input defaultValue={ini} disabled={!ativo} className="h-8 w-20 rounded-lg text-center" />
                      <span className="text-ry-ink-soft">até</span>
                      <Input defaultValue={fim} disabled={!ativo} className="h-8 w-20 rounded-lg text-center" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card id="notificacoes" className="rounded-[14px] border-ry-line p-6">
            <div className="mb-4">
              <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
                Notificações
              </span>
              <p className="text-[11.5px] text-ry-ink-soft">Como você e seus clientes são avisados</p>
            </div>
            <div className="space-y-3">
              {[
                ["Confirmação por WhatsApp", "Envia mensagem 24h antes do horário", true],
                ["Lembrete por e-mail", "Envia lembrete 2h antes", true],
                ["Alerta de cancelamento", "Aviso imediato no painel", true],
                ["Resumo diário", "Enviado às 20h com o dia seguinte", false],
              ].map((r) => {
                const [t, s, v] = r as [string, string, boolean];
                return (
                  <div key={t} className="flex items-center gap-4 border-b border-ry-line pb-3 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <b className="block text-[12.5px] font-medium">{t}</b>
                      <span className="text-[11px] text-ry-ink-soft">{s}</span>
                    </div>
                    <Switch defaultChecked={v} />
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-[10px]">Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!company || updateCompany.isPending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]"
            >
              {updateCompany.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

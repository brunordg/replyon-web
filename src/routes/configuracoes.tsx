import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Building2, Bell, Lock, Clock, Loader2, LogOut, MessageCircle } from "lucide-react";
import { useMyCompany, useUpdateCompany } from "@/lib/api/hooks/companies";
import { useConnectWhatsApp, useDisconnectWhatsApp, useWhatsAppStatus } from "@/lib/api/hooks/whatsapp";
import { WHATSAPP_STATUS_LABEL, WHATSAPP_STATUS_STYLE } from "@/lib/api/status";

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
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "seguranca", label: "Segurança", icon: Lock },
];

function ConfigPage() {
  const { data: company, isLoading } = useMyCompany();
  const updateCompany = useUpdateCompany();
  const { data: whatsapp } = useWhatsAppStatus(company?.id);
  const connectWhatsApp = useConnectWhatsApp(company?.id);
  const disconnectWhatsApp = useDisconnectWhatsApp(company?.id);

  // Company form, seeded from the fetched company. `document` is read-only
  // (the backend does not allow updating it); `address` has no backend field.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const resetForm = useCallback(() => {
    if (!company) return;
    setName(company.name);
    setEmail(company.email);
    setPhone(company.phone);
  }, [company]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleSave = () => {
    if (!company) return;
    updateCompany.mutate({ id: company.id, body: { name, email, phone } });
  };

  // Nothing to save while the company is loading, or when the form still
  // matches what is persisted.
  const isDirty =
    company != null &&
    (name !== company.name || email !== company.email || phone !== company.phone);

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

          <Card id="whatsapp" className="rounded-[14px] border-ry-line p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="font-display text-[15px] font-medium uppercase tracking-[1.2px]">
                  WhatsApp
                </span>
                <p className="text-[11.5px] text-ry-ink-soft">
                  Conecte o WhatsApp da empresa para enviar confirmações e lembretes automáticos
                </p>
              </div>
              {whatsapp && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${WHATSAPP_STATUS_STYLE[whatsapp.status]}`}
                >
                  <i className="h-1.5 w-1.5 rounded-full bg-current" />
                  {WHATSAPP_STATUS_LABEL[whatsapp.status]}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
              <div className="flex h-[200px] items-center justify-center rounded-[10px] border border-ry-line bg-ry-bg">
                {whatsapp?.status === "CONNECTING" && whatsapp.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${whatsapp.qrCodeBase64}`}
                    alt="QR Code para conectar o WhatsApp"
                    className="h-full w-full rounded-[10px] object-contain p-2"
                  />
                ) : whatsapp?.status === "CONNECTED" ? (
                  <div className="text-center text-[11.5px] text-ok">
                    <MessageCircle className="mx-auto mb-1 h-8 w-8" />
                    Conectado
                  </div>
                ) : (
                  <div className="text-center text-[11.5px] text-ry-ink-soft">
                    <MessageCircle className="mx-auto mb-1 h-8 w-8 opacity-40" />
                    Nenhuma sessão ativa
                  </div>
                )}
              </div>

              <div className="rounded-[10px] border border-ry-line p-4">
                <span className="text-[10.5px] font-medium uppercase tracking-[1px] text-ry-ink-soft">
                  Sessão
                </span>
                <p className="mb-3 truncate font-mono text-[13px] font-medium">
                  {whatsapp?.sessionName ?? "Gerada automaticamente a partir do nome da empresa"}
                </p>
                <ol className="space-y-2 text-[11.5px] text-ry-ink-soft">
                  {[
                    "Abra o WhatsApp no celular da empresa",
                    "Toque em Aparelhos conectados → Conectar aparelho",
                    "Aponte a câmera para o QR Code ao lado",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ry-blue-50 text-[9.5px] font-semibold text-ry-blue-600">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              {whatsapp?.status === "CONNECTED" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="rounded-[10px]">
                      <LogOut className="mr-1 h-4 w-4" />
                      Desconectar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar o WhatsApp?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As confirmações e lembretes automáticos por WhatsApp vão parar de ser enviados
                        até você reconectar. A sessão fica salva e pode ser reconectada a qualquer
                        momento, sem precisar gerar uma nova.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnectWhatsApp.mutate()}
                        disabled={disconnectWhatsApp.isPending}
                        className={buttonVariants({ variant: "destructive" })}
                      >
                        {disconnectWhatsApp.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        Desconectar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  onClick={() => connectWhatsApp.mutate()}
                  disabled={!company || connectWhatsApp.isPending}
                  className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]"
                >
                  {connectWhatsApp.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Conectar WhatsApp
                </Button>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={!isDirty || updateCompany.isPending}
              className="rounded-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateCompany.isPending}
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

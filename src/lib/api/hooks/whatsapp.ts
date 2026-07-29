import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { whatsappApi } from "../whatsapp";
import { ApiError } from "../client";

const KEY = "whatsapp";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useWhatsAppStatus(companyId: number | undefined) {
  return useQuery({
    queryKey: [KEY, companyId],
    queryFn: ({ signal }) => whatsappApi.status(companyId as number, signal),
    enabled: companyId != null,
    refetchInterval: (query) => (query.state.data?.status === "CONNECTED" ? false : 3000),
  });
}

export function useConnectWhatsApp(companyId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappApi.connect(companyId as number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, companyId] });
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível conectar o WhatsApp")),
  });
}

export function useDisconnectWhatsApp(companyId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappApi.disconnect(companyId as number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, companyId] });
      toast.success("WhatsApp desconectado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível desconectar o WhatsApp")),
  });
}

// Não integrada ao polling de useWhatsAppStatus: cada chamada gera um código
// novo no WAHA, invalidando o anterior. Só deve rodar em resposta a um clique
// explícito do usuário no botão "Gerar código"/"Gerar novo código".
export function useRequestPairingCode(companyId: number | undefined) {
  return useMutation({
    mutationFn: (phoneNumber: string) =>
      whatsappApi.requestPairingCode(companyId as number, phoneNumber),
    onError: (err) => toast.error(errMessage(err, "Não foi possível gerar o código de pareamento")),
  });
}

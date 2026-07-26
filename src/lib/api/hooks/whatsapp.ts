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

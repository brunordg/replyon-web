import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { conversationsApi } from "../conversations";
import { ApiError } from "../client";

const KEY = "conversations";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Open handoffs. Used both for the topbar's ambient badge (default, slower
 * cadence — mirrors useNotifications()'s always-on 60s poll, since it's
 * mounted on every page and shouldn't hammer the endpoint from an idle tab)
 * and for the /atendimento list itself, which passes a shorter interval
 * since it's the page staff is actively watching for new handoffs.
 */
export function useHandoffConversations(intervalMs = 30_000) {
  return useQuery({
    queryKey: [KEY, "open"],
    queryFn: ({ signal }) => conversationsApi.listOpenHandoffs(signal),
    refetchInterval: intervalMs,
  });
}

/** Full thread for one conversation; only polls while a thread is selected. */
export function useConversationThread(phone: string | null) {
  return useQuery({
    queryKey: [KEY, "thread", phone],
    queryFn: ({ signal }) => conversationsApi.getThread(phone as string, signal),
    enabled: phone != null,
    refetchInterval: phone != null ? 3_000 : false,
  });
}

export function useSendHumanReply(phone: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => conversationsApi.sendReply(phone as string, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "thread", phone] });
      qc.invalidateQueries({ queryKey: [KEY, "open"] });
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível enviar a resposta")),
  });
}

/** Registers a customer for this conversation's phone, by name only. */
export function useCreateCustomerForConversation(phone: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => conversationsApi.createCustomer(phone as string, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "open"] });
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível cadastrar o cliente")),
  });
}

export function useResolveHandoff(phone: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => conversationsApi.resolveHandoff(phone as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "open"] });
      qc.invalidateQueries({ queryKey: [KEY, "thread", phone] });
      toast.success("Atendimento encerrado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível encerrar o atendimento")),
  });
}

import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../notifications";

const KEY = "notifications";

/**
 * Faz polling de notificações recentes automatizadas pelo WhatsApp. Erros são
 * deixados no estado da query (não lançados) — o sino deve degradar para
 * "nada novo" em vez de quebrar o dashboard se o endpoint estiver indisponível.
 */
export function useNotifications() {
  return useQuery({
    queryKey: [KEY, "recent"],
    queryFn: ({ signal }) => notificationsApi.list(signal),
    refetchInterval: 60_000,
  });
}

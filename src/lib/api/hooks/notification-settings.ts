import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationSettingsApi } from "../notification-settings";
import { ApiError } from "../client";
import type { NotificationSettingType } from "../types";

const KEY = "notification-settings";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: [KEY],
    queryFn: ({ signal }) => notificationSettingsApi.list(signal),
  });
}

export function useUpdateNotificationSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationSettingType; enabled: boolean }) =>
      notificationSettingsApi.update(type, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Notificações atualizadas");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar a notificação")),
  });
}

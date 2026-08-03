import { apiClient } from "./client";
import type { NotificationResponse } from "./types";

const base = "/v1/notifications";

export const notificationsApi = {
  /** Notificações mais recentes do tenant atual, das mais novas para as mais antigas. */
  list: (signal?: AbortSignal) =>
    apiClient.get<NotificationResponse[]>(base, undefined, signal),
};

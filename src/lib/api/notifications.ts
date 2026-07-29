import { apiClient } from "./client";
import type { NotificationResponse } from "./types";

const base = "/v1/notifications";

export const notificationsApi = {
  /** Most recent notifications for the current tenant, newest first. */
  list: (signal?: AbortSignal) =>
    apiClient.get<NotificationResponse[]>(base, undefined, signal),
};

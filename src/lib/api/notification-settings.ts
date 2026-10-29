import { apiClient } from "./client";
import type { NotificationSettingResponse, NotificationSettingType } from "./types";

const base = "/v1/notification-settings";

export const notificationSettingsApi = {
  list: (signal?: AbortSignal) =>
    apiClient.get<NotificationSettingResponse[]>(base, undefined, signal),
  update: (type: NotificationSettingType, enabled: boolean) =>
    apiClient.put<NotificationSettingResponse>(`${base}/${type}`, { enabled }),
};

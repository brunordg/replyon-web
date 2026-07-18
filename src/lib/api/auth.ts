import { apiClient } from "./client";
import type { LoginRequest, LoginResponse } from "./types";

export const authApi = {
  login: (body: LoginRequest) =>
    apiClient.post<LoginResponse>("/v1/auth/login", body),
};

import { apiClient } from "./client";
import type { RegisterUserRequest, UserResponse } from "./types";

export const usersApi = {
  register: (body: RegisterUserRequest) =>
    apiClient.post<UserResponse>("/v1/users", body),
};

import { request } from "./client";
import type { LoginResponse } from "../../types";

export const loginWithGoogle = (idToken: string) =>
  request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { idToken },
  });

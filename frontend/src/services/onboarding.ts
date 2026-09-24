import { request } from "./api/client";

export interface LoginForm {
  interestedStocks: string[];
  amountToPutIn: number;
  question1: string;
  question2: string;
}

export interface LoginFormResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export const submitLoginForm = (payload: LoginForm, idToken: string) =>
  request<LoginFormResponse>("/api/user/login-form", {
    method: "POST",
    token: idToken,
    body: payload,
  });

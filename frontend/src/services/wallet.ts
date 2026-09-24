import type { WalletBalanceResponse } from "../types/wallet";
import { request } from "./api/client";

export const getWalletBalance = (token: string) =>
  request<WalletBalanceResponse>("/api/user/balance", { token });
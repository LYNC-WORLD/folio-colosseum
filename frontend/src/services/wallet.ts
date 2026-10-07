import type {
  WalletBalanceResponse,
  DepositSpotToPerpResponse,
  DepositStatusResponse,
} from "../types/wallet";
import { request } from "./api/client";

export const getWalletBalance = (token: string) =>
  request<WalletBalanceResponse>("/api/user/balance", { token });

export const depositSpotToPerp = (depositAmount: string, token: string) =>
  request<DepositSpotToPerpResponse>("/api/deposit/spot-to-perp", {
    token,
    method: "POST",
    body: { depositAmount },
  });

export const checkDepositStatus = (token: string) =>
  request<DepositStatusResponse>("/api/deposit/check-deposit-status", {
    token,
  });
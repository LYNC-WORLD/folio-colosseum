import { Stock } from "../types";
import { request } from "./api/client";

export type UserTransaction = {
  id: string;
  type: "BUY" | "SELL" | string;
  stock: {
    address: string;
    symbol: string;
    name: string;
    imageUrl: string;
  };
  price: number;
  amount: number;
  createdAt: string;
};

export type RecurringBuyAsset = {
  id: string;
  stockAddress: string;
  userId: string;
  usdcAmount: string | null;
  stockAmount: string | null;
  buyDate: string;
  isActive: boolean;
  stock: Stock;
};

export type UserTransactionsResponse = {
  success: boolean;
  message: string;
  data: UserTransaction[];
};

export type RecurringBuyAssetsResponse = {
  success: boolean;
  message: string;
  data: RecurringBuyAsset[];
};

export const getUserTransactions = (token: string) =>
  request<UserTransactionsResponse>("/api/user/transactions", {
    method: "GET",
    token,
  });

export const getUserRecurringBuyAssets = (token: string) =>
  request<RecurringBuyAssetsResponse>("/api/user/recurring-buy-requests", {
    method: "GET",
    token,
  });

import {
  IndexFundsResponse,
  StockDetailResponse,
  StocksResponse,
} from "../types";
import { request } from "./api/client";

export type StockCategory = "us-stock" | "pre-ipo";

export const getStocks = (category: StockCategory, idToken: string) =>
  request<StocksResponse>(`/api/stocks/${category}`, { token: idToken });

export const getStockBySymbol = (
  category: StockCategory,
  symbol: string,
  idToken: string,
) =>
  request<StockDetailResponse>(`/api/stocks/${category}/${symbol}`, {
    token: idToken,
  });

export const getIndexFunds = (idToken: string) =>
  request<IndexFundsResponse>("/api/stocks/index-funds", { token: idToken });

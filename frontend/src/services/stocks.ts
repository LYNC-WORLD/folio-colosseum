import type { StocksResponse, StockDetailResponse } from "../types/stock";
import { request } from "./api/client";

export const getStocks = () => request<StocksResponse>("/api/stocks/");

export const getStockBySymbol = (symbol: string) =>
  request<StockDetailResponse>(`/api/stocks/${symbol}`);
import { StockDetailResponse, StocksResponse } from "../types";
import { request } from "./api/client";

export const getStocks = () => request<StocksResponse>("/api/stocks/us-stock/");

export const getStockBySymbol = (symbol: string) =>
  request<StockDetailResponse>(`/api/stocks/us-stock/${symbol}`);

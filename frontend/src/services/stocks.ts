import { StocksResponse } from "../types/stock";
import { request } from "./api/client";

export const getStocks = () => request<StocksResponse>('/api/stocks/');
import { StocksResponse } from "../types";
import { request } from "./api/client";

export const getStocks = () => request<StocksResponse>("/api/stocks/");

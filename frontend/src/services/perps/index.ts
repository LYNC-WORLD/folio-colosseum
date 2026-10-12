import { request } from "../api/client";

export type PerpMarketApi = {
  id: string;
  marketName: string;
  assetId: string;
  marketSymbol: string;
  price: string; // string from the API
  changeInPrice: string; // string, e.g. "0.3367"
  maxLeverage: number;
  imageUrl: string;
  szDecimals: number;
};

export type PerpMarketsResponse = {
  success: boolean;
  message: string;
  data: PerpMarketApi[];
};

export const getPerpMarkets = () =>
  request<PerpMarketsResponse>("/api/stocks/perp-markets");

export type Stock = {
  tokenAddress: string;
  price: string;
  name: string;
  decimals: number;
  symbol: string;
  imageUrl: string;
  marketOpenPrice?: string;
  stockType?: string;
};

export type StocksResponse = {
  success: boolean;
  message: string;
  data: Stock[];
};

export type Investment = {
  id: string;
  userId: string;
  stockSymbol: string;
  stockAmount: number;
  stockAddress: string;
  investmesntAmount: number; // note: matches the API's own spelling
};

export type InvestmentInfo = {
  hasInvestment: boolean;
  data: Investment[];
};

export type RecurringBuyStock = {
  tokenAddress: string;
  price: string;
  name: string;
  decimals: number;
  symbol: string;
  imageUrl: string;
  marketOpenPrice: string;
  stockType: "USStock" | "PreIPO";
};
export type RecurringBuy = {
  id: string;
  stockAddress: string;
  userId: string;
  usdcAmount: string | null;
  stockAmount: string | null;
  buyDate: string;
  isActive: boolean;
  stock: RecurringBuyStock;
};

export type RecurringBuyInfo = {
  hasRecurringBuy: boolean;
  data: RecurringBuy[];
};

export type LatestBuy = {
  id: string;
  userId: string;
  stockAddress: string;
  stockPrice: number;
  investmentAmount: number;
  tradeType: "BUY" | "SELL";
  createdAt: string;
};

export type StockDetailData = {
  stock: Stock;
  investment: InvestmentInfo;
  recurringBuy: RecurringBuyInfo;
  latestBuys: LatestBuy[];
};

export type StockDetailResponse = {
  success: boolean;
  message: string;
  data: StockDetailData;
};

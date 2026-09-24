export type StockCategory = "us-stock" | "pre-ipo";

export type StocksStackParamList = {
  Stocks: undefined;
  StockDetail: { symbol: string; category: StockCategory };
};

export type HomeStackParamList = {
  Home: undefined;
  Stocks: undefined;
  PreIPO: undefined;
  StockDetail: { symbol: string; category: StockCategory };
};

export type TabParamList = {
  Stocks: undefined;
  PreIPO: undefined;
  Profile: undefined;
};


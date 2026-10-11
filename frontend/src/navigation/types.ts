export type StockCategory = "us-stock" | "pre-ipo";

export type StocksStackParamList = {
  Stocks: undefined;
  StockDetail: { symbol: string; category: StockCategory };
};

export type HomeStackParamList = {
  Home: undefined;
  Stocks: undefined;
  PreIPO: undefined;
  Trade: { symbol?: string } | undefined;
  IndexFunds: undefined;
  IndexFundDetail: { id: string };
  StockDetail: { symbol: string; category: StockCategory };
};

export type TabParamList = {
  Home: undefined;
  Trade: { symbol?: string } | undefined;
  Portfolio: undefined;
  Groups: undefined;
  Leaders: undefined;
  Signals: undefined;
  Profile: undefined;
};


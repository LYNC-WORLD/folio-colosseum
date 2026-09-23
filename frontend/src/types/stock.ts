export type Stock = {
  tokenAddress: string;
  price: string;
  name: string;
  decimals: number;
  symbol: string;
  imageUrl: string;
};

export type StocksResponse = {
  success: boolean;
  message: string;
  data: Stock[];
};

export type StockDetailResponse = {
  success: boolean;
  message: string;
  data: Stock;
};

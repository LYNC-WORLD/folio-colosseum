export type UsdcBalance = {
  balance: number;
  rawBalance: string;
  decimals: number;
  price: string;
  symbol: string;
  name: string;
};

export type TokenBalance = {
  tokenAccount: string;
  mint: string;
  balance: number;
  decimals: number;
  rawBalance: string;
  price: string;
  name: string;
  symbol: string;
  imageUrl: string;
    stockType: "USStock" | "PreIPO";
};

export type WalletBalance = {
  walletAddress: string;
  sol: {
    balance: number;
    lamports: number;
  };
  usdc: UsdcBalance;
  tokens: TokenBalance[];
};

export type WalletBalanceResponse = {
  success: boolean;
  message: string;
  data: WalletBalance;
};
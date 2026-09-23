export type TokenBalance = {
  balance: number;
  rawBalance?: string;
  decimals: number;
  price: string;
  symbol: string;
  name: string;
};

export type WalletBalance = {
  walletAddress: string;
  sol: {
    balance: number;
    lamports: number;
  };
  usdc: TokenBalance;
  tokens: TokenBalance[];
};

export type WalletBalanceResponse = {
  success: boolean;
  message: string;
  data: WalletBalance;
};
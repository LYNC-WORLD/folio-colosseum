export type UsdcBalance = {
  balance: number;
  rawBalance: string;
  decimals: number;
  price: string;
  symbol: string;
  name: string;
};

export type PerpBalance = {
  coin: string;
  token: number;
  total: string;
  hold: string;
  entryNtl: string;
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
  perpBalance: PerpBalance;
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

export type RecurringBuyRequest = {
  id: string;
  symbol?: string;
  stockSymbol?: string;
  amount?: number | string;
  amountPerOrder?: number | string;
  frequency?: string;
  interval?: string;
  status?: string;
  nextExecutionAt?: string;
  nextBuyAt?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type UserTransaction = {
  id: string;
  type?: string;
  status?: string;
  symbol?: string;
  stockSymbol?: string;
  amount?: number | string;
  quantity?: number | string;
  price?: number | string;
  createdAt?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type RecurringBuyResponse =
  | RecurringBuyRequest[]
  | {
      data?: RecurringBuyRequest[];
      requests?: RecurringBuyRequest[];
      recurringBuyRequests?: RecurringBuyRequest[];
    };

export type TransactionsResponse =
  | UserTransaction[]
  | {
      data?: UserTransaction[];
      transactions?: UserTransaction[];
    };

export type DepositSpotToPerpResponse = {
  success: boolean;
  message: string;
  data?: { depositAmount: string };
};

// ⚠️ assumed shape — confirm against the real response and adjust field names
export type DepositStatusResponse = {
  success: boolean;
  message: string;
  data?: {
    status: "pending" | "completed" | "failed";
    depositAmount?: string;
  };
};

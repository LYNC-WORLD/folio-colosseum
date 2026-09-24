import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWalletBalance } from "../services/wallet";
import { useAuth } from "./AuthContext";

type WalletData = Awaited<ReturnType<typeof getWalletBalance>>["data"];
type Usdc = WalletData["usdc"];
type Token = WalletData["tokens"][number];

export type WalletContextValue = {
  /** Raw wallet response */
  wallet: WalletData | undefined;
  walletAddress: string | undefined;
  usdc: Usdc | undefined;
  tokens: Token[];

  /** Derived USD values */
  usdcValue: number;
  tokensValue: number;
  usdValue: number;

  /** Status */
  loading: boolean; // first load only
  refreshing: boolean; // background refetch (every 15s or manual)
  error: string | null;
  lastUpdated: number | null; // ms timestamp of last successful fetch

  refresh: () => Promise<unknown>;
};

const EMPTY_TOKENS: Token[] = [];

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { idToken, user } = useAuth();

  const {
    data: wallet,
    isLoading,
    isFetching,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ["walletBalance", (user as any)?.id ?? user?.email],
    queryFn: () => getWalletBalance(idToken as string),
    select: (res) => res.data,
    enabled: !!idToken,
    refetchInterval: 15_000,
  });

  const value = useMemo<WalletContextValue>(() => {
    const usdcValue = wallet
      ? wallet.usdc.balance * Number(wallet.usdc.price)
      : 0;

    const tokensValue = wallet
      ? wallet.tokens.reduce((sum, t) => sum + t.balance * Number(t.price), 0)
      : 0;

    return {
      wallet,
      walletAddress: wallet?.walletAddress,
      usdc: wallet?.usdc,
      tokens: wallet?.tokens ?? EMPTY_TOKENS,

      usdcValue,
      tokensValue,
      usdValue: usdcValue + tokensValue,

      loading: isLoading,
      refreshing: isFetching && !isLoading,
      error: error instanceof Error ? error.message : null,
      lastUpdated: dataUpdatedAt || null,

      refresh: refetch,
    };
  }, [wallet, isLoading, isFetching, error, dataUpdatedAt, refetch]);

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

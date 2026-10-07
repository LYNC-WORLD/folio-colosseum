import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWalletBalance } from "../services/wallet";
import { useAuth } from "./AuthContext";

type WalletData = Awaited<ReturnType<typeof getWalletBalance>>["data"];
type Usdc = WalletData["usdc"];
type Token = WalletData["tokens"][number];
type Perp = NonNullable<WalletData["perpBalance"]>;

export type WalletContextValue = {
  /** Raw wallet response */
  wallet: WalletData | undefined;
  walletAddress: string | undefined;
  usdc: Usdc | undefined;
  tokens: Token[];
  perpBalance: Perp | undefined;

  /** Derived USD values — spot wallet */
  usdcValue: number; // cash in wallet
  tokensValue: number; // stocks + pre-IPOs
  usdValue: number; // usdcValue + tokensValue (wallet only, no perp)

  /** Derived USD values — perp account */
  perpValue: number; // total USDC in the perp account
  perpHold: number; // USDC locked in open orders
  perpAvailable: number; // perpValue - perpHold (free to transfer out)

  /** usdValue + perpValue */
  totalValue: number;

  /** Status */
  loading: boolean; // first load only
  refreshing: boolean; // background refetch (every 15s or manual)
  error: string | null;
  lastUpdated: number | null; // ms timestamp of last successful fetch

  refresh: () => Promise<unknown>;
};

const EMPTY_TOKENS: Token[] = [];

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

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
      ? num(wallet.usdc.balance) * num(wallet.usdc.price)
      : 0;

    const tokensValue = wallet
      ? wallet.tokens.reduce((sum, t) => sum + num(t.balance) * num(t.price), 0)
      : 0;

    const perpValue = num(wallet?.perpBalance?.total);
    const perpHold = num(wallet?.perpBalance?.hold);
    const usdValue = usdcValue + tokensValue;

    return {
      wallet,
      walletAddress: wallet?.walletAddress,
      usdc: wallet?.usdc,
      tokens: wallet?.tokens ?? EMPTY_TOKENS,
      perpBalance: wallet?.perpBalance ?? undefined,

      usdcValue,
      tokensValue,
      usdValue,

      perpValue,
      perpHold,
      perpAvailable: Math.max(perpValue - perpHold, 0),

      totalValue: usdValue + perpValue,

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

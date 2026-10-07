import { useQuery } from "@tanstack/react-query";
import { getWalletBalance } from "../services/wallet";
import { useAuth } from "../context/AuthContext";

export function useWalletBalance() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["walletBalance"],
    queryFn: () => getWalletBalance(idToken as string),
    select: (res) => res.data,
    enabled: !!idToken,
    refetchInterval: 15_000,
  });

  const wallet = query.data;

  const usdValue = wallet
    ? wallet.usdc.balance * Number(wallet.usdc.price) +
      wallet.tokens.reduce((sum, t) => sum + t.balance * Number(t.price), 0)
    : 0;

  const perpTotal = wallet ? Number(wallet.perpBalance.total) : 0;
  const perpHold = wallet ? Number(wallet.perpBalance.hold) : 0;
  const perpAvailable = Math.max(0, perpTotal - perpHold);

  return {
    wallet,
    walletAddress: wallet?.walletAddress,
    usdValue,
    perpBalance: wallet?.perpBalance,
    perpTotal,
    perpHold,
    perpAvailable,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.refetch,
  };
}
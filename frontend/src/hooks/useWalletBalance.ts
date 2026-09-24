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

  return {
    wallet,
    walletAddress: wallet?.walletAddress,
    usdValue,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.refetch,
  };
}

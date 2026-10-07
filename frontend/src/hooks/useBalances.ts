import { useMemo } from "react";
import { useWallet } from "../context/WalletContext";

export function useBalances() {
  const {
    usdcValue,
    perpValue,
    perpHold,
    perpAvailable,
    loading,
    refreshing,
    refresh,
  } = useWallet();

  return useMemo(
    () => ({
      spot: usdcValue, // USDC in the wallet
      perp: perpValue, // total USDC in the perp account
      perpHold, // locked in open orders
      perpAvailable, // perp - perpHold
      loading,
      refreshing,
      refresh,
    }),
    [
      usdcValue,
      perpValue,
      perpHold,
      perpAvailable,
      loading,
      refreshing,
      refresh,
    ],
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  buyStock,
  getTradeQuote,
  type TradeRequest,
  type TradeSide,
} from "../services";

export function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useTradeQuote(side: TradeSide, req: TradeRequest | null) {
  const { idToken } = useAuth();

  return useQuery({
    queryKey: ["tradeQuote", side, req],
    queryFn: () => getTradeQuote(side, idToken as string, req!),
    enabled: !!idToken && !!req,
    staleTime: 10_000,
    refetchInterval: 10_000, // keep the quote fresh while the sheet is open
    retry: 1,
  });
}

export function useBuyStock() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: TradeRequest) => buyStock(idToken as string, req),
    onSuccess: () => {
      // Prefix match: refreshes the wallet everywhere (Home pill, Profile, etc.)
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

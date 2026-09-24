import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  getTradeQuote,
  buyStock,
  sellStock,
  type TradeRequest,
  type TradeSide,
  RecurringBuyRequest,
  startRecurringBuy,
} from "../services/trade";

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useTradeQuote(side: TradeSide, req: TradeRequest | null) {
  const { idToken } = useAuth();

  return useQuery({
    queryKey: ["tradeQuote", side, req],
    queryFn: () => getTradeQuote(side, req as TradeRequest, idToken as string),
    select: (res) => res.data,
    enabled: !!req && !!idToken,

    staleTime: 10_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useBuyStock() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: TradeRequest) => {
      const res = await buyStock(req, idToken as string);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tradeQuote"] });
    },
  });
}

export function useSellStock() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: TradeRequest) => {
      const res = await sellStock(req, idToken as string);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tradeQuote"] });
    },
  });
}

export function useStartRecurringBuy() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: RecurringBuyRequest) =>
      startRecurringBuy(req, idToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

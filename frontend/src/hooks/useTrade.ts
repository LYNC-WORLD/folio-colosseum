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
  cancelRecurringBuy,
  getRecurringBuys,
  startRecurringBuy,
  type RecurringBuyRequest,
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

export function useRecurringBuys() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["recurring-buys"],
    queryFn: () => getRecurringBuys(idToken as string),
    select: (res) => res.data,
    enabled: !!idToken,
    refetchInterval: 30_000,
  });

  return {
    recurringBuys: query.data ?? [],
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}

export function useStartRecurringBuy() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: RecurringBuyRequest) =>
      startRecurringBuy(req, idToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-buys"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useCancelRecurringBuy() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recurringId: string) =>
      cancelRecurringBuy(recurringId, idToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-buys"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

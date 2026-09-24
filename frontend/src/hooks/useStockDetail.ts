import { useQuery } from "@tanstack/react-query";
import { getStockBySymbol, type StockCategory } from "../services";
import { useAuth } from "../context";

export function useStockDetail(category: StockCategory, symbol: string) {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["stock", category, symbol],
    queryFn: () => getStockBySymbol(category, symbol, idToken as string),
    select: (res) => res.data,
    enabled: !!symbol && !!idToken,
    refetchInterval: 15_000,
  });

  return {
    stock: query.data?.stock,
    investment: query.data?.investment,
    recurringBuy: query.data?.recurringBuy,
    latestBuys: query.data?.latestBuys ?? [],
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
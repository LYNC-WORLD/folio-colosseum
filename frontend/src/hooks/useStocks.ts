import { useQuery } from "@tanstack/react-query";
import { getStocks, type StockCategory } from "../services";
import { useAuth } from "../context";

export function useStocks(category: StockCategory) {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["stocks", category],
    queryFn: () => getStocks(category, idToken as string),
    select: (res) => res.data,
    enabled: !!idToken,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  return {
    stocks: query.data ?? [],
    loading: query.isPending,
    refreshing: query.isRefetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.refetch,
    reload: query.refetch,
  };
}
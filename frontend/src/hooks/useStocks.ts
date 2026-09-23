import { useQuery } from "@tanstack/react-query";
import { getStocks } from "../services";

export function useStocks() {
  const query = useQuery({
    queryKey: ["stocks"],
    queryFn: () => getStocks(),
    select: (res) => res.data,
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

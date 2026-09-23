import { useQuery } from "@tanstack/react-query";
import { getStockBySymbol } from "../services";

export function useStockDetail(symbol: string) {
  const query = useQuery({
    queryKey: ["stock", symbol],
    queryFn: () => getStockBySymbol(symbol),
    select: (res) => res.data,
    enabled: !!symbol,
    refetchInterval: 15_000,
  });

  return {
    stock: query.data,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}

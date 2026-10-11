import { useQuery } from "@tanstack/react-query";
import { getIndexFunds } from "../services";
import { useAuth } from "../context";

export function useIndexFunds() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["index-funds"],
    queryFn: () => getIndexFunds(idToken as string),
    select: (res) => res.data,
    enabled: !!idToken,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  return {
    funds: query.data ?? [],
    loading: query.isPending,
    refreshing: query.isRefetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.refetch,
    reload: query.refetch,
  };
}

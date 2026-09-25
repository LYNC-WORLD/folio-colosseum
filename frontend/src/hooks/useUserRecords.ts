import { useQuery } from "@tanstack/react-query";

import {
  getUserTransactions,
  getUserRecurringBuyAssets,
} from "../services/user";

export function useUserTransactions(token?: string) {
  return useQuery({
    queryKey: ["user", "transactions"],
    queryFn: () => getUserTransactions(token!),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });
}

export function useUserRecurringBuyAssets(token?: string) {
  return useQuery({
    queryKey: ["user", "recurring-buy-assets"],
    queryFn: () => getUserRecurringBuyAssets(token!),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });
}

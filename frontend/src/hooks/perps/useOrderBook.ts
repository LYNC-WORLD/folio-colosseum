import { useEffect, useMemo, useState } from "react";
import { toCoin, toRows, type BookRow } from "../../services/hyperliquid/format";
import type { L2Book } from "../../services/hyperliquid/types";
import { useHlSubscription } from "./useHlSubscription";

/**
 * Live order book (l2Book WebSocket, ~every block). The server sends a full snapshot each
 * message, so no diff merging is needed. nSigFigs groups price levels (lower = coarser).
 */
export function useOrderBook(sym: string, depth = 10, nSigFigs?: 2 | 3 | 4 | 5) {
  const coin = toCoin(sym);
  const [book, setBook] = useState<L2Book | null>(null);

  useEffect(() => setBook(null), [coin, nSigFigs]);
  useHlSubscription<L2Book>(nSigFigs ? { type: "l2Book", coin, nSigFigs } : { type: "l2Book", coin }, setBook);

  return useMemo(() => {
    if (!book) return { bids: [] as BookRow[], asks: [] as BookRow[], spread: 0, mid: 0, ready: false };
    const bids = toRows(book.levels[0], depth);
    const asks = toRows(book.levels[1], depth);
    const bb = bids[0]?.p ?? 0,
      ba = asks[0]?.p ?? 0;
    return {
      bids,
      asks,
      spread: bb && ba ? ba - bb : 0,
      mid: bb && ba ? (bb + ba) / 2 : bb || ba,
      ready: true,
    };
  }, [book, depth]);
}

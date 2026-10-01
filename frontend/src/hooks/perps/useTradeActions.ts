// Everything the Trade screen does that changes state. Builds wire-ready payloads
// (rounded sizes/prices, slippage cap, client order id) and sends them to our backend.

import { useCallback, useState } from "react";
import { MARKET_SLIPPAGE, MIN_NOTIONAL_USD } from "../../services/hyperliquid/config";
import { errMsg, newCloid, roundPx, roundSz, toCoin } from "../../services/hyperliquid/format";
import { tradeService, unwrap, type OrderResult, type PlaceOrderPayload } from "../../services/perps/tradeService";
import type { UiOrder, UiPosition } from "./useAccount";
import { getMarket, type PerpMarket } from "./useMarkets";

/** Same fields OrderTicketSheet already collects, plus the live mark. */
export interface TicketInput {
  sym: string;
  side: 1 | -1;
  lev: number;
  margin: number; // USDC
  kind: "Market" | "Limit" | "Stop";
  px: number | null; // limit / stop price
  tp: number | null;
  sl: number | null;
  markPx: number;
  postOnly?: boolean;
}

export interface TicketResult {
  filled: boolean; // true -> position opened, false -> order resting
  oid?: number;
  entry?: number;
  size: number;
}

const slip = (px: number, isBuy: boolean) => px * (1 + (isBuy ? 1 : -1) * MARKET_SLIPPAGE);

function needMarket(sym: string): PerpMarket {
  const m = getMarket(sym);
  if (!m) throw new Error(`${sym} is not available to trade right now`);
  return m;
}

/** Pure: ticket -> backend payload. Exported so you can unit test it. */
export function buildOrder(t: TicketInput, m: PerpMarket): PlaceOrderPayload {
  const isBuy = t.side > 0;
  const lev = Math.max(1, Math.min(Math.round(t.lev), m.maxLeverage));
  const ref = t.kind === "Market" ? t.markPx : (t.px ?? 0);
  if (!(ref > 0)) throw new Error(`Enter a ${t.kind.toLowerCase()} price`);

  const notional = t.margin * lev;
  if (notional < MIN_NOTIONAL_USD) throw new Error(`Orders must be at least $${MIN_NOTIONAL_USD} in size`);

  const size = roundSz(notional / ref, m.szDecimals);
  if (!(+size > 0)) throw new Error("Amount is too small for this market");

  return {
    coin: m.coin,
    isBuy,
    size,
    kind: t.kind.toLowerCase() as PlaceOrderPayload["kind"],
    price: roundPx(t.kind === "Market" ? slip(t.markPx, isBuy) : ref, m.szDecimals),
    leverage: lev,
    isCross: false, // Folio uses isolated margin per position
    postOnly: t.kind === "Limit" ? !!t.postOnly : undefined,
    tp: t.tp ? roundPx(t.tp, m.szDecimals) : null,
    sl: t.sl ? roundPx(t.sl, m.szDecimals) : null,
    cloid: newCloid(),
  };
}

export function useTradeActions(idToken?: string | null) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!idToken) throw new Error("Sign in to trade");
      setBusy(true);
      setError(null);
      try {
        return await fn(idToken);
      } catch (e) {
        setError(errMsg(e));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [idToken],
  );

  /** Long / Short ticket. Market fills now; Limit and Stop rest until triggered. */
  const openPosition = useCallback(
    (t: TicketInput) =>
      run(async (token): Promise<TicketResult> => {
        const payload = buildOrder(t, needMarket(t.sym));
        const r: OrderResult = await unwrap(tradeService.placeOrder(payload, token));
        if (r.status === "error") throw new Error(r.error ?? "Order rejected");
        return {
          filled: r.status === "filled",
          oid: r.oid,
          entry: r.avgPx ? +r.avgPx : undefined,
          size: +(r.totalSz ?? payload.size),
        };
      }),
    [run],
  );

  /** Close all (fraction = 1) or part of a position at market. */
  const closePosition = useCallback(
    (p: UiPosition, markPx: number, fraction = 1) =>
      run(async (token) => {
        const m = needMarket(p.coin);
        const isBuy = p.side < 0;
        const r = await unwrap(
          tradeService.placeOrder(
            {
              coin: m.coin,
              isBuy,
              size: roundSz(p.size * Math.min(1, Math.max(0, fraction)), m.szDecimals),
              kind: "market",
              price: roundPx(slip(markPx, isBuy), m.szDecimals),
              leverage: p.lev,
              isCross: p.isCross,
              reduceOnly: true,
              cloid: newCloid(),
            },
            token,
          ),
        );
        if (r.status === "error") throw new Error(r.error ?? "Close rejected");
        return r;
      }),
    [run],
  );

  const cancelOrder = useCallback(
    (o: Pick<UiOrder, "coin" | "oid">) => run((token) => unwrap(tradeService.cancelOrder({ coin: o.coin, oid: o.oid }, token))),
    [run],
  );

  /** Set, change or clear (null) TP/SL on an open position. */
  const setTpsl = useCallback(
    (p: UiPosition, tp: number | null, sl: number | null) =>
      run((token) => {
        const m = needMarket(p.coin);
        return unwrap(
          tradeService.setTpsl(
            {
              coin: m.coin,
              isLong: p.side > 0,
              size: roundSz(p.size, m.szDecimals),
              tp: tp ? roundPx(tp, m.szDecimals) : null,
              sl: sl ? roundPx(sl, m.szDecimals) : null,
              cancelOids: [p.tpOid, p.slOid].filter((x): x is number => x != null),
            },
            token,
          ),
        );
      }),
    [run],
  );

  /** + adds margin (lowers leverage, moves liquidation away), - removes it. */
  const adjustMargin = useCallback(
    (p: UiPosition, amountUsd: number) =>
      run((token) =>
        unwrap(tradeService.updateIsolatedMargin({ coin: p.coin, isBuy: p.side > 0, amountUsd }, token)),
      ),
    [run],
  );

  const setLeverage = useCallback(
    (sym: string, leverage: number, isCross = false) =>
      run((token) => unwrap(tradeService.updateLeverage({ coin: toCoin(sym), leverage, isCross }, token))),
    [run],
  );

  return { busy, error, openPosition, closePosition, cancelOrder, setTpsl, adjustMargin, setLeverage };
}

import type { UserNonFundingLedgerUpdatesResponse } from "@nktkas/hyperliquid/api/info";
import { hyperliquidInfoClient } from "./hyperliquid";

export const PERP_DEX = "xyz";
export const MIN_NET_DEPOSITS_USDC = 1;

type LedgerEntry = UserNonFundingLedgerUpdatesResponse[number];

const USDC_TOKEN = 0;

export async function fetchSpotPrices() {
  const [meta, ctxs] = await hyperliquidInfoClient.spotMetaAndAssetCtxs();
  const pxByPair = new Map(ctxs.map((ctx) => [ctx.coin, Number(ctx.midPx ?? ctx.markPx)]));
  const prices = new Map<number, number>([[USDC_TOKEN, 1]]);
  for (const pair of meta.universe) {
    const [base, quote] = pair.tokens;
    if (quote === USDC_TOKEN && !prices.has(base)) {
      prices.set(base, pxByPair.get(pair.name) ?? 0);
    }
  }
  return prices;
}

export async function fetchPerpAccountValue(
  ethAddress: string,
  spotPrices: Map<number, number>,
) {
  const user = ethAddress as `0x${string}`;
  const [xyz, main, spot] = await Promise.all([
    hyperliquidInfoClient.clearinghouseState({ user, dex: PERP_DEX }),
    hyperliquidInfoClient.clearinghouseState({ user }),
    hyperliquidInfoClient.spotClearinghouseState({ user }),
  ]);
  let value =
    Number(xyz.marginSummary.accountValue) +
    Number(main.marginSummary.accountValue);
  for (const balance of spot.balances) {
    if (!("token" in balance)) continue;
    value +=
      balance.token === USDC_TOKEN
        ? Number(balance.total) - Number(balance.hold)
        : Number(balance.total) * (spotPrices.get(balance.token) ?? 0);
  }
  return value;
}

export async function fetchLedgerUpdates(
  ethAddress: string,
  ledgerCursorMs: bigint,
) {
  const params: { user: `0x${string}`; startTime?: number } = {
    user: ethAddress as `0x${string}`,
  };
  if (ledgerCursorMs > 0n) {
    params.startTime = Number(ledgerCursorMs) + 1;
  }
  return hyperliquidInfoClient.userNonFundingLedgerUpdates(params);
}

export function applyLedgerEntries(
  netDeposits: number,
  entries: LedgerEntry[],
  ethAddress: string,
  ledgerCursorMs: bigint,
) {
  let cursorMs = ledgerCursorMs;
  let next = netDeposits;
  for (const entry of entries) {
    const t = BigInt(entry.time);
    if (t > cursorMs) cursorMs = t;
    next += ledgerDeltaUsdc(entry, ethAddress);
  }
  return { netDeposits: next, cursorMs };
}

function ledgerDeltaUsdc(entry: LedgerEntry, ethAddress: string) {
  const delta = entry.delta;
  switch (delta.type) {
    case "deposit":
      return Number(delta.usdc);
    case "withdraw":
      return -Number(delta.usdc);
    case "send":
    case "spotTransfer":
      return transferDelta(delta.user, delta.destination, Number(delta.usdcValue), ethAddress);
    case "internalTransfer":
    case "subAccountTransfer":
      return transferDelta(delta.user, delta.destination, Number(delta.usdc), ethAddress);
    default:
      return 0;
  }
}

function transferDelta(from: string, to: string, usdc: number, ethAddress: string) {
  const self = ethAddress.toLowerCase();
  from = from.toLowerCase();
  to = to.toLowerCase();
  if (from === to) return 0;
  if (to === self) return usdc;
  if (from === self) return -usdc;
  return 0;
}

export function computeReturnPercent(accountValue: number, netDeposits: number) {
  if (netDeposits < MIN_NET_DEPOSITS_USDC) return null;
  return ((accountValue - netDeposits) / netDeposits) * 100;
}


import type { UserNonFundingLedgerUpdatesResponse } from "@nktkas/hyperliquid/api/info";
import { hyperliquidInfoClient } from "./hyperliquid";

export const PERP_DEX = "xyz";
export const MIN_NET_DEPOSITS_USDC = 1;

type LedgerEntry = UserNonFundingLedgerUpdatesResponse[number];

export async function fetchPerpAccountValue(ethAddress: string) {
  const state = await hyperliquidInfoClient.clearinghouseState({
    user: ethAddress as `0x${string}`,
    dex: PERP_DEX,
  });
  return Number(state.marginSummary.accountValue);
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
    case "accountClassTransfer":
      return delta.toPerp ? Number(delta.usdc) : -Number(delta.usdc);
    case "send":
      return sendDelta(delta, ethAddress);
    case "internalTransfer": {
      const v = Number(delta.usdc);
      if (delta.destination.toLowerCase() === ethAddress.toLowerCase()) {
        return v;
      }
      if (delta.user.toLowerCase() === ethAddress.toLowerCase()) {
        return -v;
      }
      return 0;
    }
    case "subAccountTransfer": {
      const v = Number(delta.usdc);
      if (delta.destination.toLowerCase() === ethAddress.toLowerCase()) {
        return v;
      }
      if (delta.user.toLowerCase() === ethAddress.toLowerCase()) {
        return -v;
      }
      return 0;
    }
    case "spotTransfer": {
      const v = Number(delta.usdcValue);
      if (delta.destination.toLowerCase() === ethAddress.toLowerCase()) {
        return v;
      }
      if (delta.user.toLowerCase() === ethAddress.toLowerCase()) {
        return -v;
      }
      return 0;
    }
    default:
      return 0;
  }
}

function sendDelta(
  delta: Extract<LedgerEntry["delta"], { type: "send" }>,
  ethAddress: string,
) {
  const v = Number(delta.usdcValue);
  const user = delta.user.toLowerCase();
  const dest = delta.destination.toLowerCase();
  const self = ethAddress.toLowerCase();
  const fromXyz = isXyzPerpDex(delta.sourceDex);
  const toXyz = isXyzPerpDex(delta.destinationDex);
  if (dest === self && toXyz) return v;
  if (user === self && fromXyz) return -v;
  return 0;
}

function isXyzPerpDex(dex: string) {
  return dex === PERP_DEX || dex === "";
}

export function computeReturnPercent(accountValue: number, netDeposits: number) {
  if (netDeposits < MIN_NET_DEPOSITS_USDC) return null;
  return ((accountValue - netDeposits) / netDeposits) * 100;
}


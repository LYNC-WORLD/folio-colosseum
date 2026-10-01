// src/data/transferStore.ts
// MOCK balances for the spot <-> perp transfer. Replace later:
//   spot -> your wallet hook (useWalletBalance: wallet.usdc.balance)
//   perp -> your account hook (free/withdrawable margin from useAccount)
//   moveMoney -> your real transfer call
// Screens only use useBalances() and moveMoney(), so nothing else changes.

import { useSyncExternalStore } from "react";
import { fmtPx, toast } from "../data/perpsStore";

type Bal = { spot: number; perp: number };
let bal: Bal = { spot: 440, perp: 200 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const get = () => bal;

export const useBalances = (): Bal => useSyncExternalStore(subscribe, get, get);
export const getBalances = get;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** instant + free, like the prototype. dir "in" = spot -> perp, "out" = perp -> spot */
export function moveMoney(dir: "in" | "out", amt: number) {
  const src = dir === "in" ? bal.spot : bal.perp;
  if (!(amt > 0) || amt > src + 1e-9) return false;
  bal = dir === "in" ? { spot: r2(bal.spot - amt), perp: r2(bal.perp + amt) } : { spot: r2(bal.spot + amt), perp: r2(bal.perp - amt) };
  emit();
  toast(`Moved ${fmtPx(amt)} ${dir === "in" ? "to perp" : "to spot"}`, `SPOT ${fmtPx(bal.spot)} · PERP ${fmtPx(bal.perp)}`);
  return true;
}
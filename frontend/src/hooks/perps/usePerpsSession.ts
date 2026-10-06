// ONE place to connect your auth + wallet to the perps hooks.
// Until this returns real values, market data (prices, chart, order book) still works;
// account data and trading stay off.

import { useAuth } from "../../context";
import type { Address } from "../../services/hyperliquid/types";
import type { UserWallet } from "../../services/perps/walletService";

/**
 * Optional: paste any Hyperliquid address that holds xyz positions to see the
 * Positions / Orders tabs with real data while auth isn't wired yet. Read-only.
 */
const DEMO_ADDRESS: Address | null = null;

export interface PerpsSession {
  address: Address | null; // user's Hyperliquid (EVM) address
  idToken: string | null; // same token you pass to request()
  wallet: UserWallet | null; // viem / ethers signer for the user's wallet
}

export function usePerpsSession(): PerpsSession {
    const {  idToken } = useAuth();
  return { address: DEMO_ADDRESS, idToken: idToken, wallet: null };
}

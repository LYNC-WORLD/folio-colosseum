// Actions the USER'S OWN wallet must sign (EIP-712). These never go through the agent key,
// and the agent key cannot do them. Run in the app with the user's wallet
// (Privy / embedded wallet / WalletConnect) as a viem- or ethers-compatible signer.
//
// The SDK is loaded lazily, only when one of these is called, so it can never crash app
// start-up. Also add `import "react-native-get-random-values";` as the first line of index.js.

import "../hyperliquid/polyfills";
import type { ExchangeClient as ExchangeClientT, ExchangeSingleWalletConfig } from "@nktkas/hyperliquid";
import { BUILDER_ADDRESS, BUILDER_MAX_FEE, HL_ENV, STOCK_DEX, USDC_TOKEN } from "../hyperliquid/config";

/** Anything ExchangeClient accepts as a wallet: viem Account/WalletClient, ethers Signer. */
export type UserWallet = ExchangeSingleWalletConfig["wallet"];

let sdk: Promise<typeof import("@nktkas/hyperliquid")> | null = null;
let transport: unknown = null;

async function client(wallet: UserWallet): Promise<ExchangeClientT> {
  sdk ??= import("@nktkas/hyperliquid");
  const hl = await sdk;
  transport ??= new hl.HttpTransport({ isTestnet: HL_ENV === "testnet" });
  return new hl.ExchangeClient({ transport: transport as InstanceType<typeof hl.HttpTransport>, wallet });
}

export const walletService = {
  /** One time. Lets our backend's agent key place/cancel orders. It cannot withdraw. */
  approveAgent: async (wallet: UserWallet, agentAddress: `0x${string}`, agentName: string) =>
    (await client(wallet)).approveAgent({ agentAddress, agentName }),

  /** One time. Lets Folio charge up to BUILDER_MAX_FEE on each order. */
  approveBuilderFee: async (wallet: UserWallet) =>
    (await client(wallet)).approveBuilderFee({ builder: BUILDER_ADDRESS, maxFeeRate: BUILDER_MAX_FEE }),

  /** Move USDC from the main perp/spot balance into the stock dex (HIP-3 has its own margin). */
  fundStockDex: async (wallet: UserWallet, destination: `0x${string}`, amount: string, sourceDex = "") =>
    (await client(wallet)).sendAsset({ destination, sourceDex, destinationDex: STOCK_DEX, token: USDC_TOKEN, amount }),

  /** Move USDC back out of the stock dex. */
  defundStockDex: async (wallet: UserWallet, destination: `0x${string}`, amount: string, destinationDex = "") =>
    (await client(wallet)).sendAsset({ destination, sourceDex: STOCK_DEX, destinationDex, token: USDC_TOKEN, amount }),

  /** Spot <-> main perp balance. */
  usdClassTransfer: async (wallet: UserWallet, amount: string, toPerp: boolean) =>
    (await client(wallet)).usdClassTransfer({ amount, toPerp }),

  /** Withdraw USDC to Arbitrum. */
  withdraw: async (wallet: UserWallet, destination: `0x${string}`, amount: string) =>
    (await client(wallet)).withdraw3({ destination, amount }),
};

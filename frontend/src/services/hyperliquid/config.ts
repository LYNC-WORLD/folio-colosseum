// Hyperliquid connection settings. Market data is public; trading goes through our backend.

export type HlEnv = "mainnet" | "testnet";

// Keep reads and trades on the same network. Testnet has different HIP-3 dex names.
export const HL_ENV: HlEnv = "mainnet";

const URLS = {
  mainnet: { http: "https://api.hyperliquid.xyz", ws: "wss://api.hyperliquid.xyz/ws" },
  testnet: { http: "https://api.hyperliquid-testnet.xyz", ws: "wss://api.hyperliquid-testnet.xyz/ws" },
} as const;

export const HL = URLS[HL_ENV];

/** HIP-3 dex that lists US stock and commodity perps. Coins look like "xyz:NVDA". */
export const STOCK_DEX = "xyz";

/** Folio's builder address (earns the builder fee on every order). */
export const BUILDER_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

/** Fee the user approves once. Perps allow up to 0.1%. Backend charges <= this per order. */
export const BUILDER_MAX_FEE = "0.05%";

/** Worst-price cap for market orders (they are IOC limit orders on Hyperliquid). */
export const MARKET_SLIPPAGE = 0.01;

/** Hyperliquid rejects orders under $10 notional. */
export const MIN_NOTIONAL_USD = 10;

/**
 * USDC token id for sendAsset ("name:tokenId"). Mainnet value below; testnet differs.
 * Verify once with info { type: "spotMeta" } -> tokens[].name === "USDC" -> tokenId.
 */
export const USDC_TOKEN =
  HL_ENV === "mainnet" ? "USDC:0x6d1e7cde53ba9467b783cb7c530ce054" : "USDC:0xeb62eee3685fc4c43992febcd9e75443";

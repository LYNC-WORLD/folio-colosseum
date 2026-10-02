import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import {
  formatPrice,
  formatSize,
  SymbolConverter,
} from "@nktkas/hyperliquid/utils";
import { Signature, Wallet } from "ethers";
import { privateKeyToAccount } from "viem/accounts";
import { privy } from "./privy";
import { env } from "../config/env";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

const HYPERLIQUID_DEPOSIT_URL =
  "https://api.hyperunit.xyz/gen/solana/hyperliquid/sol";

export async function getDepositAddress(ethAddress: string) {
  try {
    const url = `${HYPERLIQUID_DEPOSIT_URL}/${encodeURIComponent(ethAddress)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to fetch ${ethAddress} deposit address: ${response.status}`,
      );
      return;
    }
    const data = (await response.json()) as depositAddressResponce;
    if (data.address === undefined || data.address === null) {
      console.error(`No address for ${ethAddress}`);
      return;
    }
    return data.address;
  } catch (error) {
    console.error(error);
    return;
  }
}

export async function getHyperliquidSpotBalances(
  walletAddress: string,
): Promise<HyperliquidSpotBalance[]> {
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "spotClearinghouseState",
        user: walletAddress,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`Hyperliquid API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as HyperliquidSpotBalanceResponse;

    return data.balances;
  } catch (error) {
    console.error("Failed to fetch Hyperliquid spot balances:", error);
    throw error;
  }
}

export async function sellSolForUsdc(solAmount: string, privateKey: string) {
  const wallet = privateKeyToAccount(privateKey as `0x${string}`);
  const transport = new HttpTransport();
  const converter = await SymbolConverter.create({ transport });
  const info = new InfoClient({ transport });
  const exchange = new ExchangeClient({
    transport,
    wallet,
  });

  const mids = await info.allMids();
  const mid = parseFloat(mids["SOL"]);

  const price = mid * 0.99;

  const szDecimals = converter.getSzDecimals("SOL")!;

  const result = await exchange.order({
    orders: [
      {
        a: 10156,
        b: false,
        p: formatPrice(price, szDecimals),
        r: false,
        s: formatSize(solAmount, szDecimals),
        t: {
          limit: {
            tif: "Gtc",
          },
        },
      },
    ],
    grouping: "na",
  });

  console.log("Order result:", result);

  return result;
}

export async function createAgentWallet(walletId: string) {
  const wallet = Wallet.createRandom();
  const nonce = Date.now();
  const validUntil = nonce + 150 * 24 * 60 * 60 * 1000;
  const signature = await privy
    .wallets()
    .ethereum()
    .signTypedData(walletId, {
      params: {
        typed_data: {
          domain: {
            name: "HyperliquidSignTransaction",
            version: "1",
            chainId: 1,
            verifyingContract: "0x0000000000000000000000000000000000000000",
          },
          message: {
            hyperliquidChain: "Mainnet",
            agentAddress: wallet.address,
            agentName: `trading valid_until ${validUntil}`,
            nonce: nonce,
          },
          primary_type: "HyperliquidTransaction:ApproveAgent",
          types: {
            "HyperliquidTransaction:ApproveAgent": [
              { name: "hyperliquidChain", type: "string" },
              { name: "agentAddress", type: "address" },
              { name: "agentName", type: "string" },
              { name: "nonce", type: "uint64" },
            ],
          },
        },
      },
      authorization_context: {
        authorization_private_keys: [env.PRIVY_AUTH_KEY!],
      },
    });
  const parsed = Signature.from(signature.signature);
  const body = {
    action: {
      agentAddress: wallet.address,
      agentName: `trading valid_until ${validUntil}`,
      hyperliquidChain: "Mainnet",
      nonce: nonce,
      signatureChainId: "0x1",
      type: "approveAgent",
    },
    expiresAfter: null,
    nonce: nonce,
    signature: {
      r: parsed.r,
      s: parsed.s,
      v: parsed.v,
    },
    vaultAddress: null,
  };
  const response = await fetch("https://api.hyperliquid.xyz/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    result: response,
    apiKey: wallet.address,
    apiSecret: wallet.privateKey,
  };
}

interface HyperliquidSpotBalance {
  coin: string;
  token: number;
  total: string;
  hold: string;
  entryNtl: string;
}

interface HyperliquidSpotBalanceResponse {
  balances: HyperliquidSpotBalance[];
}

interface depositAddressResponce {
  address?: string;
  [key: string]: any;
}

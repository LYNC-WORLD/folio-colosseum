import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import {
  formatPrice,
  formatSize,
  SymbolConverter,
} from "@nktkas/hyperliquid/utils";
import { Signature, Wallet } from "ethers";
import { privateKeyToAccount } from "viem/accounts";
import { getTransectionResults, privy, sendSOl } from "./privy";
import { env } from "../config/env";
import { getUSDCBalance, USDC_MINT, WSOL_MINT } from "./solana";
import { fromRawAmount, swap } from "./jupiter";
import { toBaseUnits } from "./tradeMath";
import { prisma } from "./prisma";
import { decrypt, encrypt } from "../utils/encryption";

export const hyperliquidTransport = new HttpTransport();
export const hyperliquidInfoClient = new InfoClient({
  transport: hyperliquidTransport,
});

const HYPERLIQUID_DEPOSIT_URL =
  "https://api.hyperunit.xyz/gen/solana/hyperliquid/sol";

const SOL_DECIMALS = 9;
const SOL_TRANSFER_FEE_BUFFER = 0.002;
const USOL_PAIR = "USOL/USDC";
const MIN_SPOT_ORDER_USD = 10;

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
    const data: depositAddressResponce = await response.json();

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

export async function getHyperliquidSpotBalances(walletAddress: string) {
  try {
    const data = await hyperliquidInfoClient.spotClearinghouseState({
      user: walletAddress,
    });
    return data.balances;
  } catch (error) {
    console.error("Failed to fetch Hyperliquid spot balances:", error);
    throw error;
  }
}

export async function getUsolMarket(): Promise<UsolMarket> {
  const converter = await SymbolConverter.create({
    transport: hyperliquidTransport,
  });
  const assetId = converter.getAssetId(USOL_PAIR);
  const pairId = converter.getSpotPairId(USOL_PAIR);
  const szDecimals = converter.getSzDecimals(USOL_PAIR);
  if (assetId === undefined || !pairId || szDecimals === undefined) {
    throw new Error(`${USOL_PAIR} market not found`);
  }
  const mids = await hyperliquidInfoClient.allMids();
  const mid = Number(mids[pairId]);
  if (!(mid > 0)) throw new Error(`${USOL_PAIR} has no mid price`);
  return { assetId, szDecimals, mid };
}

export async function sellSolForUsdc(
  solAmount: number,
  privateKey: string,
  market: UsolMarket,
) {
  const exchange = new ExchangeClient({
    transport: hyperliquidTransport,
    wallet: privateKeyToAccount(privateKey as `0x${string}`),
  });

  const result = await exchange.order({
    orders: [
      {
        a: market.assetId,
        b: false,
        p: formatPrice(market.mid * 0.99, market.szDecimals, "spot"),
        r: false,
        s: formatSize(solAmount, market.szDecimals),
        t: { limit: { tif: "Ioc" } },
      },
    ],
    grouping: "na",
  });

  const status = result.response.data.statuses[0];
  return typeof status === "object" && "filled" in status;
}

async function isExchangeOk(response: Response) {
  const body = await response.json().catch(() => undefined);
  return response.ok && body?.status === "ok";
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
    ok: await isExchangeOk(response),
    apiKey: wallet.address,
    apiSecret: wallet.privateKey,
  };
}

export async function getBestPriceFromOrderBook(
  marketSymbol: string,
  isBuy: boolean,
) {
  const book = await hyperliquidInfoClient.l2Book({
    coin: `xyz:${marketSymbol}`,
  });
  const best = book?.levels[isBuy ? 1 : 0][0];
  if (!best) return;
  const orderBookPrice = Number(best.px);

  return {
    orderBookPrice,
    limitPrice: orderBookPrice * (isBuy ? 1.1 : 0.9),
  };
}

export async function depositToHyperliquid(
  userId: string,
  depositAmount: string,
  solanaAddress: string,
  solanaWalletId: string,
  ethereumAddress: string,
  ethereumWalletId: string,
) {

  try {
    const usdcBalance = await getUSDCBalance(solanaAddress);
    if (usdcBalance < Number(depositAmount)) {
      return { success: false, message: "not enough balance" };
    }
    const depositAddress = await getDepositAddress(ethereumAddress);

    if (!depositAddress) {
      return {
        success: false,
        message: "cant fetch hyperliquid deposit account",
      };
    }

    const swapResult = await swap(
      solanaWalletId,
      solanaAddress,
      USDC_MINT,
      WSOL_MINT,
      toBaseUnits(Number(depositAmount), 6),
    );
    if (!swapResult.succeeded || !swapResult.outputAmount) {
      return { success: false, message: "usdc to sol swap failed" };
    }

    const solOut = fromRawAmount(swapResult.outputAmount, SOL_DECIMALS);
    const sendAmount = solOut - SOL_TRANSFER_FEE_BUFFER;
    if (sendAmount <= 0) {
      return { success: false, message: "usdc to sol swap failed" };
    }

    let sendStatus: string;
    try {
      const sentSOl = await sendSOl(
        solanaWalletId,
        sendAmount.toString(),
        depositAddress,
      );
      sendStatus = await getTransectionResults(solanaWalletId, sentSOl.id).catch(
        () => "pending",
      );
    } catch (error) {
      console.error("sol transfer to hyperliquid failed: ", error);
      sendStatus = "failed";
    }
    if (sendStatus === "failed" || sendStatus === "rejected") {
      const refund = await swap(
        solanaWalletId,
        solanaAddress,
        WSOL_MINT,
        USDC_MINT,
        swapResult.outputAmount,
      );
      return {
        success: false,
        message: refund.succeeded
          ? "sol transfer to hyperliquid failed, swapped back to usdc"
          : "sol transfer to hyperliquid failed, funds left as sol",
      };
    }
    await prisma.depositRequest.create({
      data: {
        userId: userId,
        walletAddress: ethereumAddress,
        walletId: ethereumWalletId,
        depositAmount: depositAmount,
      },
    });
    return { success: true, message: "created deposit request" };
  } catch (error) {
    console.error("error while deposit: ", error);
    return { success: false, message: "error processing request" };
  }
}

export async function checkDepositUSOL(
  ethereumAddress: string,
  market: UsolMarket,
) {
  const spotBalance = await getHyperliquidSpotBalances(ethereumAddress);
  const solana = spotBalance.find((item) => item.coin === "USOL");
  const available = Number(solana?.total ?? 0) - Number(solana?.hold ?? 0);
  return available * market.mid >= MIN_SPOT_ORDER_USD ? available : 0;
}

export async function convertUSOL(
  ethereumWalletId: string,
  usolAmount: number,
  market: UsolMarket,
): Promise<boolean> {
  const walletDetails = await prisma.wallet.findFirst({
    where: { walletId: ethereumWalletId },
    include: {
      hyperLiquidDetails: true,
    },
  });

  let agentSecret;
  if (!walletDetails?.hyperLiquidDetails) {
    const agent = await createAgentWallet(ethereumWalletId);
    if (!agent.ok) {
      return false;
    }
    agentSecret = agent.apiSecret;
    const encryptedApiSecret = encrypt(agent.apiSecret);
    await prisma.hyperLiquidDetails.create({
      data: {
        agentApiKey: agent.apiKey,
        agentApiSecret: encryptedApiSecret,
        walletId: ethereumWalletId,
      },
    });
  } else {
    const encryptedPrivateKey = walletDetails.hyperLiquidDetails.agentApiSecret;
    agentSecret = decrypt(encryptedPrivateKey);
  }
  return sellSolForUsdc(usolAmount, agentSecret, market);
}

export async function makeUnifiedAccount(walletId: string, walletAddress: string) {
  const current = await hyperliquidInfoClient.userAbstraction({
    user: walletAddress as `0x${string}`,
  });
  if (current === "unifiedAccount" || current === "portfolioMargin") return true;
  const nonce = Date.now();
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
            type: "userSetAbstraction",
            user: walletAddress,
            abstraction: "unifiedAccount",
            nonce: nonce,
            signatureChainId: "0x1",
            hyperliquidChain: "Mainnet",
          },
          primary_type: "HyperliquidTransaction:UserSetAbstraction",
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            "HyperliquidTransaction:UserSetAbstraction": [
              { name: "hyperliquidChain", type: "string" },
              { name: "user", type: "address" },
              { name: "abstraction", type: "string" },
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
      type: "userSetAbstraction",
      user: walletAddress,
      abstraction: "unifiedAccount",
      nonce: nonce,
      signatureChainId: "0x1",
      hyperliquidChain: "Mainnet",
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

  return isExchangeOk(response);
}
interface UsolMarket {
  assetId: number;
  szDecimals: number;
  mid: number;
}
interface depositAddressResponce {
  address?: string;
  [key: string]: any;
}

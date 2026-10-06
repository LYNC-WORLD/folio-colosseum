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

export async function sellSolForUsdc(solAmount: string, privateKey: string) {
  const wallet = privateKeyToAccount(privateKey as `0x${string}`);
  const converter = await SymbolConverter.create({
    transport: hyperliquidTransport,
  });
  const exchange = new ExchangeClient({
    transport: hyperliquidTransport,
    wallet,
  });

  const mids = await hyperliquidInfoClient.allMids();
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

export async function getBestPriceFromOrderBook(
  marketSymbol: string,
  isBuy: boolean,
) {
  const book = await hyperliquidInfoClient.l2Book({
    coin: `xyz:${marketSymbol}`,
  });
  if (!book) return;
  const bids = book.levels[0];
  const asks = book.levels[1];
  console.log(
    "orderBook: ",
    isBuy ? Number(asks[0].px) * 1.1 : Number(bids[0].px) * 0.9,
  );

  return {
    orderBookPrice: isBuy ? Number(asks[0].px) : Number(bids[0].px),
    limitPrice: isBuy ? Number(asks[0].px) * 1.1 : Number(bids[0].px) * 0.9,
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
    // check balance
    const usdcBalance = await getUSDCBalance(solanaAddress);
    if (usdcBalance < Number(depositAmount)) {
      return false;
    }
    const depositAddress = await getDepositAddress(ethereumAddress);
    if (!depositAddress) {
      return false;
    }

    // convert to sol
    const swapResult = await swap(
      solanaWalletId,
      solanaAddress,
      USDC_MINT,
      WSOL_MINT,
      toBaseUnits(Number(depositAmount), 6),
    );
    if (!swapResult.succeeded || !swapResult.outputAmount) {
      return false;
    }

    const solOut = fromRawAmount(swapResult.outputAmount, SOL_DECIMALS);
    const sendAmount = solOut - SOL_TRANSFER_FEE_BUFFER;
    if (sendAmount <= 0) {
      return false;
    }

    // send sol to hyperliquid
    const sentSOl = await sendSOl(
      solanaWalletId,
      sendAmount.toString(),
      depositAddress,
    );
    const sentSOlConfirmation = await getTransectionResults(
      solanaWalletId,
      sentSOl.id,
    );
    if (sentSOlConfirmation != "succeeded") {
      return false;
    }
    await prisma.depositRequest.create({
      data: {
        userId: userId,
        walletAddress: ethereumAddress,
        walletId: ethereumWalletId,
        depositAmount: depositAmount,
      },
    });
    return true;
  } catch (error) {
    console.error("error while deposit: ", error);
  }
}

export async function checkDepositUSOL(ethereumAddress: string) {
  // verify sol in spot account
  let spotBalance = await getHyperliquidSpotBalances(ethereumAddress);
  const solana = spotBalance.find((item) => item.coin === "USOL");
  if (Number(solana?.total ?? 0) <= 0) {
    return true;
  }
  return false;
}

export async function convertUSOL(
  ethereumAddress: string,
  ethereumWalletId: string,
): Promise<boolean> {
  let spotBalance = await getHyperliquidSpotBalances(ethereumAddress);
  const solana = spotBalance.find((item) => item.coin === "USOL");
  if (Number(solana?.total ?? 0) <= 0) {
    return false;
  }
  // convert sol to usdc
  const walletDetails = await prisma.wallet.findFirst({
    where: { walletId: ethereumWalletId },
    include: {
      hyperLiquidDetails: true,
    },
  });

  let agentSecret;
  if (!walletDetails?.hyperLiquidDetails) {
    const agent = await createAgentWallet(ethereumWalletId);
    if (!agent.result.ok) {
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
  const sellSOL = await sellSolForUsdc(
    (solana?.total ?? 0).toString(),
    agentSecret,
  );
  if (sellSOL.status != "ok") {
    return false;
  }
  spotBalance = await getHyperliquidSpotBalances(ethereumAddress);
  const usdc = spotBalance.find((item) => item.coin === "USDC");
  if (Number(usdc?.total ?? 0) <= 0) {
    return false;
  }
  return true;
}
interface depositAddressResponce {
  address?: string;
  [key: string]: any;
}

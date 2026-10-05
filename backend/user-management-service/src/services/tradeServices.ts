import { setTimeout as sleep } from "node:timers/promises";
import { Prisma } from "../generated/client";
import { prisma } from "../lib/prisma";
import { getQuote, swap, isRetryable, fromRawAmount } from "../lib/jupiter";
import type { SwapFailureKind, SwapResult } from "../lib/jupiter";
import { getUSDCBalance, USDC_MINT } from "../lib/solana";
import {
  averagePrice,
  costBasisAfterSell,
  indexOrder,
  toBaseUnits,
} from "../lib/tradeMath";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";
const USDC_DECIMALS = 6;
const SWAP_SPACING_MS = 1500;
export const MIN_RECURRING_USDC = 5;

export type TradeSwapResult =
  | {
      status: "succeeded";
      data: {
        signature?: string;
        inputAmount?: string;
        outputAmount?: string;
        requestId?: string;
        recorded: boolean;
      };
    }
  | {
      status: "failed";
      kind?: SwapFailureKind;
      code?: number;
      error?: string;
      requestId?: string;
      signature?: string;
    };

export class TradeService {
  public async getQuoteBuy(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    stockType: string,
  ) {
    try {
      const price = await getStockPrice(stockType, stockAddress, stockSymbol);
      if (!price) {
        return;
      }
      const usdc = stockAmount ? stockAmount * price : (usdcAmount ?? 0);
      return await getQuote(
        USDC_MINT,
        stockAddress,
        toBaseUnits(usdc, USDC_DECIMALS),
      );
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getQuoteSell(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    tokenDecimal: number,
    stockType: string,
  ) {
    try {
      const price = await getStockPrice(stockType, stockAddress, stockSymbol);
      if (!price) {
        return;
      }
      const stocks = stockAmount || (usdcAmount ?? 0) / price;
      return await getQuote(
        stockAddress,
        USDC_MINT,
        toBaseUnits(stocks, tokenDecimal),
      );
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async buyStock(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    taker: string,
    userId: string,
    stockType: string,
    tokenDecimal: number,
  ): Promise<TradeSwapResult | undefined> {
    const price = await getStockPrice(stockType, stockAddress, stockSymbol);
    if (!price) {
      return;
    }
    const usdc = stockAmount ? stockAmount * price : (usdcAmount ?? 0);
    const result = await swap(
      walletId,
      taker,
      USDC_MINT,
      stockAddress,
      toBaseUnits(usdc, USDC_DECIMALS),
    );
    if (!result.succeeded) {
      return tradeFailure(result);
    }

    const usdcSpent = fromRawAmount(result.inputAmount, USDC_DECIMALS);
    const stocks = fromRawAmount(result.outputAmount, tokenDecimal);
    const fillPrice = stocks ? usdcSpent / stocks : price;

    const recorded = await recordTrade(
      { tradeType: "BUY", userId, stockAddress, usdcSpent, stocks, requestId: result.requestId, signature: result.signature },
      async (tx) => {
        const held = await tx.investment.findFirst({
          where: { userId, stockAddress },
        });
        if (!held) {
          await tx.investment.create({
            data: {
              stockAddress,
              stockAmount: stocks,
              stockSymbol,
              userId,
              investmentAmount: usdcSpent,
              averageStockPrice: fillPrice.toString(),
            },
          });
        } else {
          await tx.investment.update({
            where: { id: held.id },
            data: {
              stockAmount: held.stockAmount + stocks,
              investmentAmount: held.investmentAmount + usdcSpent,
              averageStockPrice: averagePrice(
                held.stockAmount,
                held.investmentAmount,
                stocks,
                usdcSpent,
              ).toString(),
            },
          });
        }
        await tx.trades.create({
          data: {
            investmentAmount: usdcSpent,
            stockAddress,
            stockPrice: fillPrice,
            tradeType: "BUY",
            userId,
          },
        });
      },
    );
    return tradeSuccess(result, recorded);
  }

  public async sellStock(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    taker: string,
    userId: string,
    tokenDecimal: number,
    stockType: string,
  ): Promise<TradeSwapResult | undefined> {
    const price = await getStockPrice(stockType, stockAddress, stockSymbol);
    if (!price) {
      return;
    }
    const stocks = stockAmount || (usdcAmount ?? 0) / price;
    const result = await swap(
      walletId,
      taker,
      stockAddress,
      USDC_MINT,
      toBaseUnits(stocks, tokenDecimal),
    );
    if (!result.succeeded) {
      return tradeFailure(result);
    }

    const stocksSold = fromRawAmount(result.inputAmount, tokenDecimal);
    const usdcReceived = fromRawAmount(result.outputAmount, USDC_DECIMALS);
    const fillPrice = stocksSold ? usdcReceived / stocksSold : price;

    const recorded = await recordTrade(
      { tradeType: "SELL", userId, stockAddress, stocksSold, usdcReceived, requestId: result.requestId, signature: result.signature },
      async (tx) => {
        const held = await tx.investment.findFirst({
          where: { userId, stockAddress },
        });
        if (held) {
          await tx.investment.update({
            where: { id: held.id },
            data: {
              stockAmount: Math.max(0, held.stockAmount - stocksSold),
              investmentAmount: costBasisAfterSell(
                held.stockAmount,
                held.investmentAmount,
                stocksSold,
              ),
            },
          });
        }
        await tx.trades.create({
          data: {
            investmentAmount: usdcReceived,
            stockAddress,
            stockPrice: fillPrice,
            tradeType: "SELL",
            userId,
          },
        });
      },
    );
    return tradeSuccess(result, recorded);
  }

  public async startRecurringBuy(
    stockAddress: string,
    stockAmount: string | undefined,
    usdcAmount: string | undefined,
    buyDate: string,
    userId: string,
  ) {
    try {
      const stock = await prisma.stocks.findUnique({
        where: { tokenAddress: stockAddress },
        select: { symbol: true, stockType: true },
      });
      if (!stock) {
        return { error: "stock not found" };
      }
      const usdc = usdcAmount
        ? Number(usdcAmount)
        : Number(stockAmount) *
          (await getStockPrice(stock.stockType, stockAddress, stock.symbol));
      if (!Number.isFinite(usdc)) {
        return;
      }
      if (usdc < MIN_RECURRING_USDC) {
        return { error: `Minimum recurring buy is $${MIN_RECURRING_USDC}` };
      }
      const data = await prisma.recurringBuyRequest.create({
        data: {
          buyDate: buyDate,
          stockAddress: stockAddress,
          userId: userId,
          stockAmount: stockAmount,
          usdcAmount: usdcAmount,
        },
      });
      return data;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  // Index Funds
  public async buyIndexFunds(
    indexId: string,
    indexAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userDbId: string,
    taker: string,
  ) {
    const indexDetails = await prisma.indexFunds.findUnique({
      where: { id: indexId },
      include: { stocks: true },
    });
    if (!indexDetails) return;
    const stocks = indexDetails.stocks;
    const order = indexOrder(await getStockPrices(stocks), usdcAmount, indexAmount);
    if (!order) return;
    if (order.totalUsdc > (await getUSDCBalance(taker))) return;

    const results: SwapResult[] = [];
    for (const [i, stock] of stocks.entries()) {
      if (i) await sleep(SWAP_SPACING_MS);
      results.push(
        await jupiterSwapWithRetry(
          walletId,
          taker,
          USDC_MINT,
          stock.tokenAddress,
          toBaseUnits(order.usdcPerStock, USDC_DECIMALS),
        ),
      );
    }
    const succeeded = results.filter((result) => result.succeeded);
    const bought = succeeded.length;
    const unconfirmed = results.filter((r) => r.kind === "unconfirmed").length;
    if (!bought) return unconfirmedIndexResult(unconfirmed);

    const boughtAmount = (order.indexAmount * bought) / stocks.length;
    const boughtCost = succeeded.reduce(
      (sum, result) => sum + fromRawAmount(result.inputAmount, USDC_DECIMALS),
      0,
    );
    const recorded = await recordTrade(
      { tradeType: "INDEX_BUY", userDbId, indexId, boughtAmount, boughtCost, requestIds: succeeded.map((r) => r.requestId) },
      async (tx) => {
        const owned = await tx.indexFundsHolding.findFirst({
          where: { indexId, userId: userDbId },
        });
        if (owned) {
          const heldAmount = Number(owned.indexQuantity);
          await tx.indexFundsHolding.update({
            where: { id: owned.id },
            data: {
              indexQuantity: (heldAmount + boughtAmount).toString(),
              indexPrice: averagePrice(
                heldAmount,
                heldAmount * Number(owned.indexPrice),
                boughtAmount,
                boughtCost,
              ).toString(),
            },
          });
        } else {
          await tx.indexFundsHolding.create({
            data: {
              indexId,
              indexQuantity: boughtAmount.toString(),
              userId: userDbId,
              indexPrice: (boughtCost / boughtAmount).toString(),
            },
          });
        }
      },
    );
    const complete = bought == stocks.length;
    return {
      success: complete,
      message: complete ? "index fund bought" : "index fund partially bought",
      data: { indexFundAmount: boughtAmount, unconfirmed, recorded },
    };
  }

  public async sellIndexFunds(
    indexId: string,
    indexAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userDbId: string,
    taker: string,
  ) {
    const indexDetails = await prisma.indexFunds.findUnique({
      where: { id: indexId },
      include: { stocks: true },
    });
    if (!indexDetails) return;
    const stocks = indexDetails.stocks;
    const order = indexOrder(await getStockPrices(stocks), usdcAmount, indexAmount);
    if (!order) return;

    const indexHolding = await prisma.indexFundsHolding.findFirst({
      where: {
        indexId: indexId,
        userId: userDbId,
      },
    });
    const heldAmount = Number(indexHolding?.indexQuantity ?? 0);
    if (!indexHolding || heldAmount < order.indexAmount) return;

    const results: SwapResult[] = [];
    for (const [i, stock] of stocks.entries()) {
      if (i) await sleep(SWAP_SPACING_MS);
      results.push(
        await jupiterSwapWithRetry(
          walletId,
          taker,
          stock.tokenAddress,
          USDC_MINT,
          toBaseUnits(order.stockAmounts[i], stock.decimals),
        ),
      );
    }
    const sold = results.filter((result) => result.succeeded).length;
    const unconfirmed = results.filter((r) => r.kind === "unconfirmed").length;
    if (!sold) return unconfirmedIndexResult(unconfirmed);

    const soldAmount = (order.indexAmount * sold) / stocks.length;
    const recorded = await recordTrade(
      { tradeType: "INDEX_SELL", userDbId, indexId, soldAmount },
      async (tx) => {
        const holding = await tx.indexFundsHolding.findUniqueOrThrow({
          where: { id: indexHolding.id },
        });
        await tx.indexFundsHolding.update({
          where: { id: holding.id },
          data: {
            indexQuantity: Math.max(
              0,
              Number(holding.indexQuantity) - soldAmount,
            ).toString(),
          },
        });
      },
    );
    const complete = sold == stocks.length;
    return {
      success: complete,
      message: complete ? "index fund sold" : "index fund partially sold",
      data: { indexFundAmount: soldAmount, unconfirmed, recorded },
    };
  }
}

function tradeSuccess(result: SwapResult, recorded: boolean): TradeSwapResult {
  return {
    status: "succeeded",
    data: {
      signature: result.signature,
      inputAmount: result.inputAmount,
      outputAmount: result.outputAmount,
      requestId: result.requestId,
      recorded,
    },
  };
}

function tradeFailure(result: SwapResult): TradeSwapResult {
  return {
    status: "failed",
    kind: result.kind,
    code: result.code,
    error: result.error,
    requestId: result.requestId,
    signature: result.signature,
  };
}

function unconfirmedIndexResult(unconfirmed: number) {
  if (!unconfirmed) return;
  return {
    success: false,
    message: "index fund swaps submitted but not confirmed",
    data: { indexFundAmount: 0, unconfirmed, recorded: false },
  };
}

async function recordTrade(
  details: Record<string, unknown>,
  write: (tx: Prisma.TransactionClient) => Promise<unknown>,
) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await prisma.$transaction(write);
      return true;
    } catch (error) {
      console.error("Trade DB write failed:", { attempt, ...details }, error);
    }
  }
  console.error("UNRECORDED TRADE, reconcile manually:", details);
  return false;
}

async function jupiterSwapWithRetry(
  walletId: string,
  taker: string,
  inputMint: string,
  outputMint: string,
  amount: string,
) {
  let result = await swap(walletId, taker, inputMint, outputMint, amount);
  if (!result.succeeded && isRetryable(result)) {
    await sleep(SWAP_SPACING_MS);
    result = await swap(walletId, taker, inputMint, outputMint, amount);
  }
  return result;
}

// Price functions
function getStockPrices(
  stocks: { stockType: string; tokenAddress: string; symbol: string }[],
) {
  return Promise.all(
    stocks.map((stock) =>
      getStockPrice(stock.stockType, stock.tokenAddress, stock.symbol),
    ),
  );
}

async function getStockPrice(
  stockType: string,
  stockAddress: string,
  stockSymbol: string,
) {
  const price =
    stockType == "USStock"
      ? await getUSStockPrice(stockSymbol)
      : await getPreIPOStockPrice(stockAddress);
  return Number(price);
}

async function getUSStockPrice(stockSymbol: string) {
  try {
    const url = `${XSTOCKS_API}/public/assets/${encodeURIComponent(
      stockSymbol,
    )}/price-data`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch ${stockSymbol}: ${response.status}`);
      return;
    }
    const data = (await response.json()) as XStocksPriceResponse;
    if (data.quote === undefined || data.quote === null) {
      console.error(`No price returned for ${stockSymbol}`);
      return;
    }
    return data.quote;
  } catch (error) {
    console.error(error);
    return;
  }
}

async function getPreIPOStockPrice(
  stockAddress: string,
): Promise<string | null> {
  try {
    // Fetch the API only once
    const response = await fetch("https://prestocks.com/api/prestocks");

    if (!response.ok) {
      throw new Error(
        `PreStocks API error: ${response.status} ${response.statusText}`,
      );
    }

    const stocks = (await response.json()) as PreStock[];

    // Find the stock using its contract/token address
    const stock = stocks.find((item) => item.contract_address === stockAddress);

    if (!stock) {
      console.warn(`PreIPO stock not found for address: ${stockAddress}`);
      return null;
    }

    return String(stock.tokenPrice);
  } catch (error) {
    console.error("Error fetching PreIPO stock price:", error);
    return null;
  }
}
interface XStocksPriceResponse {
  quote?: number;
  [key: string]: any;
}
interface PreStock {
  name: string;
  symbol: string;
  image: string;
  contract_address: string;
  markPrice: number;
  markValuation: number;
  tokenPrice: number;
  impliedValuation: number;
  supply: number;
}

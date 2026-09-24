import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { getTransectionResults, privy } from "../lib/privy";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";

export class TradeService {
  public async getQuoteBuy(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (stockAmount) {
        usdcAmount = price * stockAmount;
      }
      const qoute = await privy
        .wallets()
        .swaps()
        .quote(walletId, {
          destination: {
            asset_address: stockAddress,
          },
          source: {
            asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          base_amount: String(usdcAmount * 1000000).split(".")[0],
          amount_type: "exact_input",
        });
      return qoute;
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
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      console.log("Price: ", price);

      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (!stockAmount) {
        stockAmount = usdcAmount / price;
      }

      console.log({
        destination: {
          asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        },
        source: {
          asset_address: stockAddress,
          caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
        base_amount: String(stockAmount * 100000000).split(".")[0],
        amount_type: "exact_input",
      });
      const qoute = await privy
        .wallets()
        .swaps()
        .quote(walletId, {
          destination: {
            asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          },
          source: {
            asset_address: stockAddress,
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          base_amount: String(stockAmount * 100000000).split(".")[0],
          amount_type: "exact_input",
        });

      // qoute.
      return qoute;
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
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (stockAmount) {
        usdcAmount = stockAmount * price;
      } else {
        stockAmount = usdcAmount / price;
      }
      const responce = await buyStockOnChain(
        stockAddress,
        usdcAmount,
        walletId,
      );
      const result = await getTransectionResults(walletId, responce.id);
      if (result != "succeeded") {
        return { status: result };
      }
      const currentInvestedInStock = await prisma.investment.findFirst({
        where: {
          userId: userId,
          stockAddress: stockAddress,
        },
      });
      if (!currentInvestedInStock) {
        await prisma.investment.create({
          data: {
            stockAddress: stockAddress,
            stockAmount: stockAmount,
            stockSymbol: stockSymbol,
            userId: userId,
            investmesntAmount: usdcAmount,
          },
        });
      } else {
        const investmentUSDCAmount =
          currentInvestedInStock.investmesntAmount + usdcAmount;
        const investedStockAmount =
          currentInvestedInStock.stockAmount + stockAmount;
        await prisma.investment.update({
          where: {
            id: currentInvestedInStock.id,
          },
          data: {
            stockAmount: investedStockAmount,
            investmesntAmount: investmentUSDCAmount,
          },
        });
      }
      await prisma.trades.create({
        data: {
          investmentAmount: usdcAmount,
          stockAddress: stockAddress,
          stockPrice: price,
          tradeType: "BUY",
          userId: userId,
        },
      });
      return { responce: responce, status: result };
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async sellStock(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      console.log("price: ", price);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (!stockAmount) {
        stockAmount = usdcAmount / price;
      }
      const responce = await sellStockOnChain(
        stockAddress,
        stockAmount,
        walletId,
      );
      const result = await getTransectionResults(walletId, responce.id);
      if (result != "succeeded") {
        return { status: result };
      }
      const currentInvestedInStock = await prisma.investment.findFirst({
        where: {
          userId: userId,
          stockAddress: stockAddress,
        },
      });
      if (!currentInvestedInStock) {
        await prisma.investment.create({
          data: {
            stockAddress: stockAddress,
            stockAmount: 0,
            stockSymbol: stockSymbol,
            userId: userId,
            investmesntAmount: 0,
          },
        });
      } else {
        const investmentUSDCAmount =
          currentInvestedInStock.investmesntAmount - usdcAmount;
        const investedStockAmount =
          currentInvestedInStock.stockAmount - stockAmount;
        await prisma.investment.update({
          where: {
            id: currentInvestedInStock.id,
          },
          data: {
            stockAmount: investedStockAmount,
            investmesntAmount: investmentUSDCAmount,
          },
        });
      }
      await prisma.trades.create({
        data: {
          investmentAmount: usdcAmount,
          stockAddress: stockAddress,
          stockPrice: price,
          tradeType: "SELL",
          userId: userId,
        },
      });
      return { responce: responce, status: result };
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async startRecurringBuy(
    stockAddress: string,
    stockAmount: string | undefined,
    usdcAmount: string | undefined,
    buyDate: string,
    userId: string,
  ) {
    try {
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
}

async function buyStockOnChain(
  stockAddress: string,
  usdcAmount: number,
  walletId: string,
) {
  const responce = await privy
    .wallets()
    .swaps()
    .execute(walletId, {
      destination: {
        asset_address: stockAddress,
      },
      source: {
        asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
      base_amount: String(usdcAmount * 1000000).split(".")[0],
      amount_type: "exact_input",
      authorization_context: {
        authorization_private_keys: [env.PRIVY_AUTH_KEY!],
      },
    });
  return responce;
}

async function sellStockOnChain(
  stockAddress: string,
  stockAmount: number,
  walletId: string,
) {
  const responce = await privy
    .wallets()
    .swaps()
    .execute(walletId, {
      destination: {
        asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      },
      source: {
        asset_address: stockAddress,
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
      base_amount: String(stockAmount * 100000000).split(".")[0],
      amount_type: "exact_input",
      authorization_context: {
        authorization_private_keys: [env.PRIVY_AUTH_KEY!],
      },
    });
  return responce;
}

async function getStockPrice(walletSymbol: string) {
  try {
    const url = `${XSTOCKS_API}/public/assets/${encodeURIComponent(
      walletSymbol,
    )}/price-data`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch ${walletSymbol}: ${response.status}`);
      return;
    }
    const data = (await response.json()) as XStocksPriceResponse;
    if (data.quote === undefined || data.quote === null) {
      console.error(`No price returned for ${walletSymbol}`);
      return;
    }
    return data.quote;
  } catch (error) {
    console.error(error);
    return;
  }
}
interface XStocksPriceResponse {
  quote?: number;
  [key: string]: any;
}

import { dailyStartStockPriceCron } from "../cron/DailyStockPrice";
import { prisma } from "../server";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";

interface XStocksPriceResponse {
  quote?: string | number;
  [key: string]: any;
}

export async function updateStockPrices(): Promise<void> {
  try {
    await Promise.all([
      updateUSStocksPrice(false),
      updatePreStocksPrice(false),
    ]);
    console.log("Stock price update completed");
  } catch (error) {
    console.error("Stock price cron failed:", error);
  }
}


export async function updateDailyOpenPrices(): Promise<void> {
  try {
    await Promise.all([updateUSStocksPrice(true), updatePreStocksPrice(true)]);
    console.log("[DailyOpenPrice] Update completed");
  } catch (error) {
    console.error("[DailyOpenPrice] Cron failed:", error);
  }
}

async function updateUSStocksPrice(updateDailyPrice: boolean) {
  const usStocks = await prisma.stocks.findMany({
    where: { stockType: "USStock" },
    select: {
      tokenAddress: true,
      symbol: true,
      name: true,
    },
  });
  console.log(usStocks);

  console.log(`Updating ${usStocks.length} stocks...`);

  for (const stock of usStocks) {
    try {
      const url = `${XSTOCKS_API}/public/assets/${encodeURIComponent(
        stock.symbol,
      )}/price-data`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Failed to fetch ${stock.symbol}: ${response.status}`);
        continue;
      }

      const data = (await response.json()) as XStocksPriceResponse;

      // console.log(`${stock.symbol}:`, data);

      if (data.quote === undefined || data.quote === null) {
        console.error(`No price returned for ${stock.symbol}`);
        continue;
      }
      if (updateDailyPrice) {
        await prisma.stocks.update({
          where: {
            tokenAddress: stock.tokenAddress,
          },
          data: {
            marketOpenPrice: String(data.quote),
          },
        });
      }
      await prisma.stocks.update({
        where: {
          tokenAddress: stock.tokenAddress,
        },
        data: {
          price: String(data.quote),
        },
      });
      console.log(`Updated usstock Prices`);
    } catch (error) {
      console.error(`Error updating ${stock.symbol}:`, error);
    }
  }
  return;
}

async function updatePreStocksPrice(updateDailyPrice: boolean) {
  const preStocks = await prisma.stocks.findMany({
    where: { stockType: "USStock" },
    select: {
      tokenAddress: true,
      symbol: true,
      name: true,
    },
  });

  console.log(`Updating ${preStocks.length} stocks...`);

  try {
    const response = await fetch("https://prestocks.com/api/prestocks");
    if (!response.ok) {
      throw new Error(
        `PreStocks API failed: ${response.status} ${response.statusText}`,
      );
    }
    const apiStocks = (await response.json()) as PreStock[];
    const dbStocks = await prisma.stocks.findMany({
      where: {
        stockType: "PreIPO",
      },
    });
    const apiStockMap = new Map(
      apiStocks.map((stock) => [stock.symbol, stock]),
    );
    for (const dbStock of dbStocks) {
      const apiStock = apiStockMap.get(dbStock.symbol);

      if (!apiStock) {
        console.warn(`No PreStocks data found for ${dbStock.symbol}`);
        continue;
      }
      if (updateDailyPrice) {
        await prisma.stocks.update({
          where: {
            tokenAddress: dbStock.tokenAddress,
          },
          data: {
            marketOpenPrice: String(apiStock.tokenPrice),
          },
        });
      }
      await prisma.stocks.update({
        where: {
          tokenAddress: dbStock.tokenAddress,
        },
        data: {
          price: String(apiStock.tokenPrice),
        },
      });

      console.log(`Updated ${dbStock.symbol}: ${apiStock.tokenPrice}`);
    }
    console.log("PreIPO stock price update completed");
    console.log(`Found ${dbStocks.length} preIPO stocks in DB`);
  } catch (error) {
    console.error(`Error updating prestock prices:`, error);
  }
  return;
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
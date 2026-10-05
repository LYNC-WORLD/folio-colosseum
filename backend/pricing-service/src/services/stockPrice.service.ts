import { prisma } from "../lib/prisma";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";
const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export async function updateStockPrices(): Promise<void> {
  try {
    await Promise.all([
      updateUSStocksPrice(false),
      updatePreStocksPrice(false),
      updatePerpStockPrice(),
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
      await prisma.stocks.update({
        where: {
          tokenAddress: stock.tokenAddress,
        },
        data: {
          price: String(data.quote),
          ...(updateDailyPrice && { marketOpenPrice: String(data.quote) }),
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
      await prisma.stocks.update({
        where: {
          tokenAddress: dbStock.tokenAddress,
        },
        data: {
          price: String(apiStock.tokenPrice),
          ...(updateDailyPrice && {
            marketOpenPrice: String(apiStock.tokenPrice),
          }),
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

async function updatePerpStockPrice() {
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "metaAndAssetCtxs",
        dex: "xyz",
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Hyperliquid API error: ${response.status} ${response.statusText}`,
      );
    }
    const data = (await response.json()) as HyperliquidResponse;
    const [meta, assetContexts] = data;
    const stocks = await prisma.perpStocks.findMany();

    if (stocks.length === 0) {
      console.log("No perp stocks found in database");
      return;
    }

    const marketMap = new Map<
      string,
      {
        asset: HyperliquidAsset;
        context: AssetContext;
      }
    >();
    meta.universe.forEach((asset, index) => {
      const context = assetContexts[index];

      if (!context) {
        return;
      }

      marketMap.set(asset.name, {
        asset,
        context,
      });
    });
    const updates = [];
    for (const stock of stocks) {
      const hyperliquidMarket = `xyz:${stock.marketSymbol}`;

      const market = marketMap.get(hyperliquidMarket);

      if (!market) {
        console.warn(`Hyperliquid market not found: ${hyperliquidMarket}`);
        continue;
      }

      const { context } = market;

      const markPx = Number(context.markPx);
      const prevDayPx = Number(context.prevDayPx);

      if (
        !Number.isFinite(markPx) ||
        !Number.isFinite(prevDayPx) ||
        prevDayPx === 0
      ) {
        console.warn(`Invalid price data for ${stock.marketSymbol}`, {
          markPx: context.markPx,
          prevDayPx: context.prevDayPx,
        });

        continue;
      }
      const changeInPrice = ((markPx - prevDayPx) / prevDayPx) * 100;

      updates.push(
        prisma.perpStocks.update({
          where: {
            id: stock.id,
          },
          data: {
            price: markPx.toString(),
            changeInPrice: changeInPrice.toFixed(4),
          },
        }),
      );
    }
    if (updates.length === 0) {
      console.log("No stocks needed updating");
      return;
    }

    await prisma.$transaction(updates);

    console.log(`Successfully updated ${updates.length} perp stocks`);
  } catch (error) {
    console.log("error: ", error);
  }
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
interface XStocksPriceResponse {
  quote?: string | number;
  [key: string]: any;
}

interface AssetContext {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string | null;
  oraclePx: string;
  markPx: string;
  midPx: string | null;
  impactPxs: string[] | null;
  dayBaseVlm: string;
}

interface HyperliquidAsset {
  szDecimals: number;
  name: string;
  maxLeverage: number;
}

type HyperliquidResponse = [
  {
    universe: HyperliquidAsset[];
    marginTables: unknown[];
    collateralToken: number;
  },
  AssetContext[],
];

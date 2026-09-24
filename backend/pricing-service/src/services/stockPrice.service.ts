import { prisma } from "../server";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";

interface XStocksPriceResponse {
  quote?: string | number;
  [key: string]: any;
}

export async function updateStockPrices(): Promise<void> {
  try {
    const stocks = await prisma.stocks.findMany({
      select: {
        tokenAddress: true,
        symbol: true,
        name: true,
      },
    });

    console.log(`Updating ${stocks.length} stocks...`);

    for (const stock of stocks) {
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
          },
        });

        // console.log(`Updated ${stock.symbol} -> ${data.quote}`);
      } catch (error) {
        console.error(`Error updating ${stock.symbol}:`, error);
      }
    }

    console.log("Stock price update completed");
  } catch (error) {
    console.error("Stock price cron failed:", error);
  }
}

export async function updateDailyOpenPrices(): Promise<void> {
  try {
    const stocks = await prisma.stocks.findMany({
      select: {
        tokenAddress: true,
        symbol: true,
        name: true,
      },
    });

    console.log(`[DailyOpenPrice] Updating ${stocks.length} stocks...`);

    for (const stock of stocks) {
      try {
        const url = `${XSTOCKS_API}/public/assets/${encodeURIComponent(
          stock.symbol,
        )}/price-data`;

        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            `[DailyOpenPrice] Failed to fetch ${stock.symbol}: ${response.status}`,
          );
          continue;
        }

        const data = (await response.json()) as XStocksPriceResponse;

        if (data.quote === undefined || data.quote === null) {
          console.error(
            `[DailyOpenPrice] No quote returned for ${stock.symbol}`,
          );
          continue;
        }

        await prisma.stocks.update({
          where: {
            tokenAddress: stock.tokenAddress,
          },
          data: {
            marketOpenPrice: String(data.quote),
          },
        });

        console.log(`[DailyOpenPrice] ${stock.symbol} -> ${data.quote}`);
      } catch (error) {
        console.error(
          `[DailyOpenPrice] Error updating ${stock.symbol}:`,
          error,
        );
      }
    }

    console.log("[DailyOpenPrice] Update completed");
  } catch (error) {
    console.error("[DailyOpenPrice] Cron failed:", error);
  }
}

// (async () => {
//   try {
//     const data = await updateStockPrices();
//     console.log(data);
//   } catch (error) {
//     console.error("Error executing async code:", error);
//   }
// })();

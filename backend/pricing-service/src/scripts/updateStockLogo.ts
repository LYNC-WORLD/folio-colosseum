import { prisma } from "../server";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";

interface XStocksPriceResponse {
  logo?: string | number;
  [key: string]: any;
}

export async function getStockUrl(): Promise<void> {
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
        )}`;

        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Failed to fetch ${stock.symbol}: ${response.status}`);
          continue;
        }

        const data = (await response.json()) as XStocksPriceResponse;

        console.log(`${stock.symbol}:`, data);

        if (data.logo === undefined || data.logo === null) {
          console.error(`No price returned for ${stock.symbol}`);
          continue;
        }

        await prisma.stocks.update({
          where: {
            tokenAddress: stock.tokenAddress,
          },
          data: {
            imageUrl: String(data.logo),
          },
        });

        console.log(`Updated ${stock.symbol} -> ${data.logo}`);
      } catch (error) {
        console.error(`Error updating ${stock.symbol}:`, error);
      }
    }

    console.log("Stock price update completed");
  } catch (error) {
    console.error("Stock price cron failed:", error);
  }
}

(async () => {
  try {
    await getStockUrl();
  } catch (error) {
    console.error("Error executing async code:", error);
  }
})();
import { prisma } from "../lib/prisma";

export class StockService {
  public async getStocks() {
    try {
      const stockDetails = await prisma.stocks.findMany();
      return stockDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getStockById(stockSymbol: string) {
    try {
      const stockDetails = await prisma.stocks.findFirst({
        where: {
          symbol: stockSymbol,
        },
      });
      return stockDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getLatestBuy(stockAddress: string) {
    try {
      const trades = await prisma.trades.findMany({
        where: {
          stockAddress,
          tradeType: "BUY",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });

      return trades;
    } catch (error) {
      console.error("Failed to fetch latest buys:", error);
      throw error;
    }
  }
}

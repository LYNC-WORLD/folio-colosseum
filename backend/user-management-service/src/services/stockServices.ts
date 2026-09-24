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

  public async getStockDetails(stockSymbol: string, userId: string) {
    try {
      const stock = await prisma.stocks.findFirst({
        where: {
          symbol: stockSymbol,
        },
      });

      if (!stock) {
        return null;
      }

      const stockAddress = stock.tokenAddress;
      const [investments, recurringBuys, latestBuys] = await Promise.all([
        prisma.investment.findMany({
          where: {
            userId,
            stockAddress,
          },
        }),

        prisma.recurringBuyRequest.findMany({
          where: {
            userId,
            stockAddress,
          },
          orderBy: {
            id: "desc",
          },
        }),

        prisma.trades.findMany({
          where: {
            stockAddress,
            tradeType: "BUY",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
          select: {
            id: true,
            userId: true,
            stockAddress: true,
            stockPrice: true,
            investmentAmount: true,
            tradeType: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        stock,

        investment: {
          hasInvestment: investments.length > 0,
          data: investments,
        },

        recurringBuy: {
          hasRecurringBuy: recurringBuys.length > 0,
          data: recurringBuys,
        },

        latestBuys,
      };
    } catch (error) {
      console.error("Failed to fetch stock details:", error);
      throw error;
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

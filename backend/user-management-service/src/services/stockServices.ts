import { prisma } from "../lib/prisma";

export class StockService {
  public async getUSStocks() {
    try {
      const stockDetails = await prisma.stocks.findMany({
        where: {
          stockType: "USStock",
        },
      });
      return stockDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getPreIPO() {
    try {
      const stockDetails = await prisma.stocks.findMany({
        where: {
          stockType: "PreIPO",
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

        this.getLatestBuy(stockAddress),
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

  public async getIndexFunds() {
    try {
      const indexFunds = await prisma.indexFunds.findMany({
        include: {
          stocks: true
        }
      });
      indexFunds.forEach(indexFund => {
        var totalPrice = 0;
        indexFund.stocks.forEach(stock => {
          totalPrice += Number(stock.price);
        });
        indexFund.price = (
          totalPrice / (indexFund.stocks.length || 1)
        ).toString();
      });
      return indexFunds;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getPerpStocks() {
    try {
      const perpStocks = await prisma.perpStocks.findMany();
      return perpStocks;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

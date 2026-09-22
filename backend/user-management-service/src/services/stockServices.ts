import { prisma } from "../server";

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
}

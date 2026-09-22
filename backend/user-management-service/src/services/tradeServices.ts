import { prisma } from "../lib/prisma";

export class TradeService {
  public async getQuote() {
    try {
      const stockDetails = await prisma.stocks.findMany();
      return stockDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

import { prisma } from "../server";

export class UserService {
  public async getBalance() {
    try {
      const stockDetails = await prisma.stocks.findMany();
      return stockDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

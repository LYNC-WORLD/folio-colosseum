import { depositToHyperliquid } from "../lib/hyperliquid";
import { prisma } from "../lib/prisma";

export class DepositService {
  public async createDepositRequest(
    userId: string,
    depositAmount: string,
    solanaAddress: string,
    solanaWalletId: string,
    ethereumAddress: string,
    ethereumWalletId: string,
  ) {
    const success = await depositToHyperliquid(
      userId,
      depositAmount,
      solanaAddress,
      solanaWalletId,
      ethereumAddress,
      ethereumWalletId,
    );
    return success;
    try {
    } catch (error) {
      console.error(error);
    }
  }

  public async checkDepositRequest(userId: string) {
    const recentRequest = await prisma.depositRequest.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return recentRequest?.conversionCompleted;
  }
}

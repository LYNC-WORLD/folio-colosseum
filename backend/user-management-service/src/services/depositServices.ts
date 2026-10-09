import { depositToHyperliquid, makeUnifiedAccount } from "../lib/hyperliquid";
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
    const result = await depositToHyperliquid(
      userId,
      depositAmount,
      solanaAddress,
      solanaWalletId,
      ethereumAddress,
      ethereumWalletId,
    );
    if (result.success) {
      const unified = await makeUnifiedAccount(
        ethereumWalletId,
        ethereumAddress,
      ).catch((error) => {
        console.error("makeUnifiedAccount error: ", error);
        return false;
      });
      if (!unified) console.error(`unified account not set for ${ethereumAddress}`);
    }
    return result;
  }

  public async checkDepositRequest(userId: string) {
    return prisma.depositRequest.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

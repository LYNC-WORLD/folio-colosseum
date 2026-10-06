import { checkDepositUSOL, convertUSOL } from "../lib/hyperliquid";
import { prisma } from "../lib/prisma";

export async function CheckDepositRequest() {
  const activeRequest = await prisma.depositRequest.findMany({
    where: { conversionCompleted: false },
  });
  activeRequest.forEach(async (depositRequest) => {
    if (!depositRequest.depositCompleted) {
      const depositComplete = await checkDepositUSOL(
        depositRequest.walletAddress,
      );
      if (!depositComplete) {
        return;
      }
      await prisma.depositRequest.update({
        where: { id: depositRequest.id },
        data: {
          depositCompleted: depositComplete,
        },
      });
    }
    const conversionComplete = await convertUSOL(
      depositRequest.walletAddress,
      depositRequest.walletId,
    );
    if (!conversionComplete) {
      return;
    }
    await prisma.depositRequest.update({
      where: { id: depositRequest.id },
      data: {
        conversionComplete: conversionComplete,
      },
    });
  });
}

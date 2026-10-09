import {
  checkDepositUSOL,
  convertUSOL,
  spotSolToUsdc,
} from "../lib/hyperliquid";
import { prisma } from "../lib/prisma";
import { getSolBalance } from "../lib/solana";

export async function CheckDepositRequest() {
  const activeRequest = await prisma.depositRequest.findMany({
    where: { conversionCompleted: false },
  });
  await Promise.all(
    activeRequest.map(async (depositRequest) => {
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
            depositCompleted: true,
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
          conversionCompleted: true,
        },
      });
    }),
  );
}

export async function CheckWithdrawRequest() {
  const activeRequest = await prisma.withdrawRequest.findMany({
    where: { conversionCompleted: false },
  });
  await Promise.all(
    activeRequest.map(async (withdrawRequest) => {
      const solAmount = await getSolBalance(
        withdrawRequest.solanaWalletAddress,
      );
      if (!withdrawRequest.withdrawCompleted) {
        if (!(solAmount >= 0.12)) {
          return;
        }
        await prisma.withdrawRequest.update({
          where: { id: withdrawRequest.id },
          data: {
            depositCompleted: true,
          },
        });
      }

      const conversionComplete = await spotSolToUsdc(
        (solAmount - 0.01).toString(),
        withdrawRequest.solanaWalletAddress,
        withdrawRequest.solanaWalletId,
      );

      if (!conversionComplete.success) {
        return;
      }

      await prisma.withdrawRequest.update({
        where: { id: withdrawRequest.id },
        data: {
          conversionCompleted: true,
        },
      });
    }),
  );
}

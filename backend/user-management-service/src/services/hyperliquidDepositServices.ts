import { checkDepositUSOL, convertUSOL, getUsolMarket, spotSolToUsdc } from "../lib/hyperliquid";
import { prisma } from "../lib/prisma";
import { getSolBalance } from "../lib/solana";

export async function CheckDepositRequest() {
  const activeRequest = await prisma.depositRequest.findMany({
    where: { conversionCompleted: false },
  });
  if (!activeRequest.length) return;

  const market = await getUsolMarket();
  const wallets = new Map<string, typeof activeRequest>();
  for (const request of activeRequest) {
    wallets.set(request.walletId, [...(wallets.get(request.walletId) ?? []), request]);
  }

  await Promise.all(
    [...wallets.values()].map(async (requests) => {
      const { walletAddress, walletId } = requests[0];
      const ids = { id: { in: requests.map((request) => request.id) } };
      try {
        const usolAmount = await checkDepositUSOL(walletAddress, market);
        if (!usolAmount) return;

        await prisma.depositRequest.updateMany({
          where: ids,
          data: { depositCompleted: true },
        });

        if (!(await convertUSOL(walletId, usolAmount, market))) return;

        await prisma.depositRequest.updateMany({
          where: ids,
          data: { conversionCompleted: true },
        });
      } catch (error) {
        console.error(`[DepositCron] wallet ${walletAddress} failed:`, error);
      }
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
            withdrawCompleted: true,
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

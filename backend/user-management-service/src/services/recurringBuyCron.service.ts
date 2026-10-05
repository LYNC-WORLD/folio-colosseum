import { setTimeout as sleep } from "node:timers/promises";
import { Chain } from "../generated/enums";
import { prisma } from "../lib/prisma";
import { isDue } from "../lib/recurringBuySchedule";
import { TradeService } from "./tradeServices";

const tradeService = new TradeService();

export async function processRecurringBuys(now = new Date()) {
  const requests = await prisma.recurringBuyRequest.findMany({
    where: { isActive: true },
    include: {
      stock: true,
      user: { include: { wallets: true } },
    },
  });

  let ran = 0;
  let skipped = 0;
  let failed = 0;

  for (const request of requests) {
    if (!isDue(request.buyDate, request.createdAt, request.lastExecutedAt, now)) {
      skipped++;
      continue;
    }

    const solWallet = request.user.wallets.find(
      (wallet) => wallet.chain === Chain.SOLANA,
    );
    if (!solWallet) {
      console.error("[RecurringBuy] no Solana wallet:", request.id);
      failed++;
      continue;
    }

    const usdcAmount = request.usdcAmount
      ? Number(request.usdcAmount)
      : undefined;
    const stockAmount = request.stockAmount
      ? Number(request.stockAmount)
      : undefined;

    const result = await tradeService
      .buyStock(
        request.stockAddress,
        request.stock.symbol,
        stockAmount,
        usdcAmount,
        solWallet.walletId,
        solWallet.walletAddress,
        request.userId,
        request.stock.stockType,
        request.stock.decimals,
      )
      .catch((error) => {
        console.error("[RecurringBuy] error:", request.id, error);
        return undefined;
      });

    const unconfirmed = result?.status === "failed" && result.kind === "unconfirmed";
    if (result?.status === "succeeded" || unconfirmed) {
      await prisma.recurringBuyRequest.update({
        where: { id: request.id },
        data: { lastExecutedAt: now },
      });
    }
    if (result?.status === "succeeded") {
      ran++;
      console.log("[RecurringBuy] succeeded:", request.id, request.userId);
    } else {
      failed++;
      console.error(
        unconfirmed
          ? "[RecurringBuy] unconfirmed, not retrying this month; reconcile manually:"
          : "[RecurringBuy] failed, will retry tomorrow:",
        request.id,
        result,
      );
    }

    await sleep(1500);
  }

  console.log("[RecurringBuy] done:", { ran, skipped, failed, total: requests.length });
}

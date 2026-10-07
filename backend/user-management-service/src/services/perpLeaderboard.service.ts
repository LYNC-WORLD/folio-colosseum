import { setTimeout as sleep } from "node:timers/promises";
import { Chain } from "../generated/enums";
import {
  applyLedgerEntries,
  computeReturnPercent,
  fetchLedgerUpdates,
  fetchPerpAccountValue,
  fetchSpotPrices,
} from "../lib/perpLeaderboardMetrics";
import { prisma } from "../lib/prisma";

const REFRESH_CONCURRENCY = 8;
const STAGGER_MS = 200;

export async function refreshAllSnapshots() {
  const started = Date.now();
  const wallets = await prisma.wallet.findMany({
    where: { chain: Chain.ETH },
    include: { user: { select: { id: true, name: true } } },
  });
  const spotPrices = await fetchSpotPrices();

  let refreshed = 0;
  let failed = 0;
  let index = 0;

  async function worker() {
    while (index < wallets.length) {
      const i = index++;
      const wallet = wallets[i];
      if (i > 0) await sleep(STAGGER_MS);
      try {
        await refreshOneWallet(
          wallet.user.id,
          wallet.user.name,
          wallet.walletAddress,
          spotPrices,
        );
        refreshed++;
      } catch (error) {
        failed++;
        console.error("[PerpLeaderboard] wallet refresh failed:", wallet.walletAddress, error);
        await prisma.perpLeaderboardSnapshot.upsert({
          where: { userId: wallet.user.id },
          create: {
            userId: wallet.user.id,
            ethAddress: wallet.walletAddress,
            displayName: wallet.user.name,
            refreshError: String(error),
          },
          update: {
            displayName: wallet.user.name,
            refreshError: String(error),
          },
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(REFRESH_CONCURRENCY, wallets.length) }, () =>
      worker(),
    ),
  );

  await recomputeRanks();

  console.log("[PerpLeaderboard] refresh done:", {
    refreshed,
    failed,
    total: wallets.length,
    durationMs: Date.now() - started,
  });
}

async function refreshOneWallet(
  userId: string,
  displayName: string,
  ethAddress: string,
  spotPrices: Map<number, number>,
) {
  const existing = await prisma.perpLeaderboardSnapshot.findUnique({
    where: { userId },
  });
  const priorNet = Number(existing?.netDepositsUsdc ?? 0);
  const priorCursor = existing?.ledgerCursorMs ?? 0n;

  const [entries, accountValue] = await Promise.all([
    fetchLedgerUpdates(ethAddress, priorCursor),
    fetchPerpAccountValue(ethAddress, spotPrices),
  ]);

  const { netDeposits, cursorMs } = applyLedgerEntries(
    priorNet,
    entries,
    ethAddress,
    priorCursor,
  );
  const returnPercent = computeReturnPercent(accountValue, netDeposits);

  await prisma.perpLeaderboardSnapshot.upsert({
    where: { userId },
    create: {
      userId,
      ethAddress,
      displayName,
      netDepositsUsdc: String(netDeposits),
      accountValue: String(accountValue),
      returnPercent,
      ledgerCursorMs: cursorMs,
      refreshError: null,
    },
    update: {
      ethAddress,
      displayName,
      netDepositsUsdc: String(netDeposits),
      accountValue: String(accountValue),
      returnPercent,
      ledgerCursorMs: cursorMs,
      refreshError: null,
    },
  });
}

async function recomputeRanks() {
  const eligible = await prisma.perpLeaderboardSnapshot.findMany({
    where: { returnPercent: { not: null } },
    orderBy: { returnPercent: "desc" },
    select: { userId: true },
  });

  await prisma.perpLeaderboardSnapshot.updateMany({ data: { rank: null } });
  for (let i = 0; i < eligible.length; i++) {
    await prisma.perpLeaderboardSnapshot.update({
      where: { userId: eligible[i].userId },
      data: { rank: i + 1 },
    });
  }
}

export async function getLeaderboard(limit: number, offset: number) {
  const [rows, totalRanked, latest] = await Promise.all([
    prisma.perpLeaderboardSnapshot.findMany({
      where: { rank: { not: null } },
      orderBy: { rank: "asc" },
      skip: offset,
      take: limit,
      select: {
        rank: true,
        displayName: true,
        returnPercent: true,
        accountValue: true,
        netDepositsUsdc: true,
        refreshedAt: true,
      },
    }),
    prisma.perpLeaderboardSnapshot.count({ where: { rank: { not: null } } }),
    prisma.perpLeaderboardSnapshot.findFirst({
      where: { rank: { not: null } },
      orderBy: { refreshedAt: "desc" },
      select: { refreshedAt: true },
    }),
  ]);

  return {
    entries: rows,
    totalRanked,
    refreshedAt: latest?.refreshedAt ?? null,
  };
}

export async function getMyLeaderboardEntry(userId: string) {
  const me = await prisma.perpLeaderboardSnapshot.findUnique({
    where: { userId },
  });
  if (!me) {
    return { entry: null, neighbors: [], totalRanked: 0 };
  }

  const totalRanked = await prisma.perpLeaderboardSnapshot.count({
    where: { rank: { not: null } },
  });

  let neighbors: typeof me[] = [];
  if (me.rank != null) {
    neighbors = await prisma.perpLeaderboardSnapshot.findMany({
      where: {
        rank: {
          gte: Math.max(1, me.rank - 2),
          lte: me.rank + 2,
        },
      },
      orderBy: { rank: "asc" },
    });
  }

  return { entry: me, neighbors, totalRanked };
}

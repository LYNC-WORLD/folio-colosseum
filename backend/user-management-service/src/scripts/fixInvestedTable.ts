import { Chain } from "../generated/enums";
import { prisma } from "../lib/prisma";
import { createEVMWallet } from "../lib/privy";
import { solana } from "../lib/solana";

async function setData() {
  const invested = await prisma.investment.findMany({
    where: {
      averageStockPrice: "0",
    },
  });
  console.log(invested);
  for (const investment of invested) {
    if (investment.stockAmount === 0) {
      console.log(`Skipping ${investment.id}: stockAmount is 0`);
      continue;
    }

    const averagePrice = investment.investmentAmount / investment.stockAmount;

    await prisma.investment.update({
      where: {
        id: investment.id,
      },
      data: {
        averageStockPrice: String(averagePrice),
      },
    });

    console.log(`Updated ${investment.stockSymbol}: ${averagePrice}`);
  }
}

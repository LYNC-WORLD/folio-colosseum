import { prisma } from "../lib/prisma";

async function createIndexFund() {
  //   const indexFund = await prisma.indexFunds.create({
  //     data: {
  //       name: "AI prestock",
  //       stocks: {
  //         connect: [
  //           { tokenAddress: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw" },
  //           { tokenAddress: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF" },
  //         ],
  //       },
  //       price: "0",
  //     },
  //     include: {
  //       stocks: true,
  //     },
  //   });
  const data = await prisma.indexFunds.findMany({
    include: { stocks: true },
  });
  console.log(JSON.stringify(data, null, 2));
}
(async () => {
  try {
    const data = await createIndexFund();
  } catch (error) {
    console.error("Error executing async code:", error);
  }
})();

import { prisma } from "../lib/prisma";

async function createIndexFund() {
    const indexFund = await prisma.indexFunds.create({
      data: {
        name: "MANGO",
        stocks: {
          connect: [
            { tokenAddress: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu" },
            { tokenAddress: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg" },
            { tokenAddress: "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL" },
            { tokenAddress: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN" },
            { tokenAddress: "XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL" },
          ],
        },
        price: "0",
      },
      include: {
        stocks: true,
      },
    });
  // const data = await prisma.indexFunds.findMany({
  //   include: { stocks: true },
  // });
  // console.log(JSON.stringify(data, null, 2));
}
(async () => {
  try {
    const data = await createIndexFund();
  } catch (error) {
    console.error("Error executing async code:", error);
  }
})();

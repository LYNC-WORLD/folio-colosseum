import {
  createAgentWallet,
  getDepositAddress,
  getHyperliquidSpotBalances,
  sellSolForUsdc,
} from "../lib/hyperliquid";
import { prisma } from "../lib/prisma";
import {
  buyStockOnChain,
  getBuyQuote,
  getTransectionResults,
  sendSOl,
} from "../lib/privy";
import { getUSDCBalance } from "../lib/solana";
import { decrypt, encrypt } from "../utils/encryption";

export class HyperliquidService {
  public async depositToPerp(
    depositAmount: string,
    solanaAddress: string,
    solanaWalletId: string,
    ethereumAddress: string,
    ethereumWalletId: string,
  ) {
    try {
      // check balance
      const usdcBalance = await getUSDCBalance(solanaAddress);
      if (usdcBalance < Number(depositAmount)) {
        return;
      }
      const [depositAddress, quote] = await Promise.all([
        getDepositAddress(ethereumAddress),
        getBuyQuote("native", Number(depositAmount), solanaWalletId),
      ]);
      if (!depositAddress) {
        return;
      }
      // convert to sol
      const stockSold = await buyStockOnChain(
        "native",
        Number(depositAmount),
        solanaWalletId,
      );
      const stockSoldConfirmation = await getTransectionResults(
        solanaWalletId,
        stockSold.id,
      );
      if (stockSoldConfirmation != "succeeded") {
        return;
      }
      // send sol to hyperliquid
      const sentSOl = await sendSOl(
        solanaWalletId,
        (Number(quote.minimum_output_amount) / 10 ** 9).toString(),
        depositAddress,
      );
      const sentSOlConfirmation = await getTransectionResults(
        solanaWalletId,
        sentSOl.id,
      );
      if (sentSOlConfirmation != "succeeded") {
        return;
      }
      // verify sol in spot account
      let spotBalance = await getHyperliquidSpotBalances(ethereumAddress);
      const solana = spotBalance.find((item) => item.coin === "USOL");
      if (Number(solana?.total ?? 0) <= 0) {
        return;
      }
      // convert sol to usdc
      const walletDetails = await prisma.wallet.findFirst({
        where: { walletId: ethereumWalletId },
        include: {
          hyperLiquidDetails: true,
        },
      });

      let agentSecret;
      if (!walletDetails?.hyperLiquidDetails) {
        const agent = await createAgentWallet(ethereumWalletId);
        if (!agent.result.ok) {
          return;
        }
        agentSecret = agent.apiSecret;
        const encryptedApiSecret = encrypt(agent.apiSecret);
        await prisma.hyperLiquidDetails.create({
          data: {
            agentApiKey: agent.apiKey,
            agentApiSecret: encryptedApiSecret,
            walletId: ethereumWalletId,
          },
        });
      } else {
        const encryptedPrivateKey =
          walletDetails.hyperLiquidDetails.agentApiSecret;
        agentSecret = decrypt(encryptedPrivateKey);
      }
      const sellSOL = await sellSolForUsdc(
        (solana?.total ?? 0).toString(),
        agentSecret,
      );
      if (sellSOL.status != "ok") {
        return;
      }
      spotBalance = await getHyperliquidSpotBalances(ethereumAddress);
      const usdc = spotBalance.find((item) => item.coin === "USDC");
      if (Number(solana?.total ?? 0) <= 0) {
        return;
      }
      return usdc?.total;
    } catch (error) {
      console.error("error while deposit: ", error);
    }
  }
}

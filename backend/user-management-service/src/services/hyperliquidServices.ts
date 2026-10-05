import {
  createAgentWallet,
  getDepositAddress,
  getHyperliquidSpotBalances,
  sellSolForUsdc,
} from "../lib/hyperliquid";
import { swap, fromRawAmount } from "../lib/jupiter";
import { prisma } from "../lib/prisma";
import { getTransectionResults, sendSOl } from "../lib/privy";
import { getUSDCBalance, USDC_MINT, WSOL_MINT } from "../lib/solana";
import { toBaseUnits } from "../lib/tradeMath";
import { decrypt, encrypt } from "../utils/encryption";

const SOL_DECIMALS = 9;
const SOL_TRANSFER_FEE_BUFFER = 0.002;

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
      const depositAddress = await getDepositAddress(ethereumAddress);
      if (!depositAddress) {
        return;
      }

      // convert to sol
      const swapResult = await swap(
        solanaWalletId,
        solanaAddress,
        USDC_MINT,
        WSOL_MINT,
        toBaseUnits(Number(depositAmount), 6),
      );
      if (!swapResult.succeeded || !swapResult.outputAmount) {
        return;
      }

      const solOut = fromRawAmount(swapResult.outputAmount, SOL_DECIMALS);
      const sendAmount = solOut - SOL_TRANSFER_FEE_BUFFER;
      if (sendAmount <= 0) {
        return;
      }

      // send sol to hyperliquid
      const sentSOl = await sendSOl(
        solanaWalletId,
        sendAmount.toString(),
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
      if (Number(usdc?.total ?? 0) <= 0) {
        return;
      }
      return usdc?.total;
    } catch (error) {
      console.error("error while deposit: ", error);
    }
  }
}

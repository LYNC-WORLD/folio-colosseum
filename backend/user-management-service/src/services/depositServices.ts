import { workers } from "node:cluster";
import {
  depositToHyperliquid,
  getHyperliquidSpotBalances,
  getWithdrawAddress,
  makeUnifiedAccount,
  sellUsdcForSol,
  sendSolToSpot,
} from "../lib/hyperliquid";
import { prisma } from "../lib/prisma";

export class DepositService {
  public async createDepositRequest(
    userId: string,
    depositAmount: string,
    solanaAddress: string,
    solanaWalletId: string,
    ethereumAddress: string,
    ethereumWalletId: string,
  ) {
    const success = await depositToHyperliquid(
      userId,
      depositAmount,
      solanaAddress,
      solanaWalletId,
      ethereumAddress,
      ethereumWalletId,
    );
    const unifiedAccount = await makeUnifiedAccount(
      ethereumWalletId,
      ethereumAddress,
    );
    return success;
    try {
    } catch (error) {
      console.error(error);
    }
  }

  public async checkDepositRequest(userId: string) {
    const recentRequest = await prisma.depositRequest.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return recentRequest?.conversionCompleted;
  }

  public async createWithdrawlRequest(
    userId: string,
    withdrawAmountInDollar: string,
    ethWalletId: string,
    ethAddress: string,
    solanaWalletId: string,
    solanaAddress: string,
  ) {
    try {
      const walletDetails = await prisma.wallet.findFirst({
        where: {
          walletAddress: ethAddress,
        },
        include: {
          hyperLiquidDetails: true,
        },
      });
      if (Number(withdrawAmountInDollar) < 15) {
        return {
          success: false,
          message: "withdraw amount should be greater then $15",
        };
      }
      if (!walletDetails || !walletDetails.hyperLiquidDetails) {
        return {
          success: false,
          message: "can not fetch wallet details",
        };
      }
      const spotSwap = await sellUsdcForSol(
        withdrawAmountInDollar,
        walletDetails.hyperLiquidDetails.agentApiSecret,
      );
      if (spotSwap.responce.status != "ok") {
        return {
          success: false,
          message: "spot swap failed",
        };
      }
      let spotBalance = await getHyperliquidSpotBalances(ethAddress);
      const solana = spotBalance.find((item) => item.coin === "USOL");
      if (Number(solana?.total ?? 0) <= 0.12) {
        return {
          success: false,
          message: "USOL balance is low",
        };
      }
      const solAmount = solana?.total ?? "0";
      const withdrawAddress = await getWithdrawAddress(solanaAddress);
      if (solAmount == "0" || !withdrawAddress) {
        return {
          success: false,
          message: "can not fetch solana address",
        };
      }
      const solToSwap = await sendSolToSpot(
        withdrawAddress,
        ethWalletId,
        solAmount,
      );
      await prisma.withdrawRequest.create({
        data: {
          solanaWalletAddress: solanaAddress,
          solanaWalletId: solanaWalletId,
          withdrawAmount: withdrawAmountInDollar,
          userId: userId,
        },
      });
      return {
        success: true,
        message: "deposit request submitted",
        data: solToSwap,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "error in withdraw request",
      };
    }
  }

  public async checkWithdrawRequest(userId: string) {
    const recentRequest = await prisma.withdrawRequest.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return recentRequest?.conversionCompleted;
  }
}

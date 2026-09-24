import { prisma } from "../lib/prisma";
import { getWalletTokens } from "../lib/solana";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export class UserService {
  public async getBalance(walletAddress: string) {
    try {
      const tokenDetails = await getWalletTokens(walletAddress);
      if (!tokenDetails) {
        return;
      }
      const usdcToken = tokenDetails.tokens.find(
        (token) => token.mint.toString() === USDC_MINT,
      );
      const normalTokens = tokenDetails.tokens.filter(
        (token) => token.mint.toString() !== USDC_MINT,
      );
      const tokenAddresses = normalTokens.map((token) => token.mint);
      const stocks = await prisma.stocks.findMany({
        where: {
          tokenAddress: {
            in: tokenAddresses,
          },
        },
      }); // Get stockes details from prisma
      const priceMap = new Map(
        stocks.map((stock) => [stock.tokenAddress, stock]),
      );
      const result = {
        walletAddress: tokenDetails.walletAddress,

        sol: tokenDetails.sol,

        usdc: usdcToken
          ? {
              balance: usdcToken.balance,
              rawBalance: usdcToken.rawBalance,
              decimals: usdcToken.decimals,
              price: "1",
              symbol: "USDC",
              name: "USD Coin",
            }
          : {
              balance: 0,
              rawBalance: "0",
              decimals: 6,
              price: "1",
              symbol: "USDC",
              name: "USD Coin",
            },

        tokens: normalTokens.map((token) => {
          const stock = priceMap.get(token.mint.toString());

          return {
            ...token,
            price: stock?.price ?? null,
            name: stock?.name ?? null,
            symbol: stock?.symbol ?? null,
            imageUrl: stock?.imageUrl ?? null,
            stockType: stock?.stockType ?? "USStock",
          };
        }),
      };
      return result;
    } catch (error) {
      console.error(error);
      return;
    }
  }
  public async setLoginFormData(email: string, data: loginForm) {
    try {
      const responce = await prisma.loginDetails.create({
        data: {
          email: email,
          amountToPutIn: 0,
          expectToHold: data.question2,
          positionHold: data.question1,
          interestedStocks: data.interestedStocks,
        },
      });
      return responce;
    } catch (error) {
      return;
    }
  }
  public async getRecurrentBuyRequest(userId: string) {
    try {
      const data = await prisma.recurringBuyRequest.findMany({
        where: {
          userId: userId,
        },
        include: {
          stock: true,
        },
      });
      return data;
    } catch (error) {
      return;
    }
  }
  public async cancelRecurringBuyRequest(userId: string, recurringId: string) {
    try {
      const data = await prisma.recurringBuyRequest.update({
        where: { id: recurringId },
        data: {
          isActive: false,
        },
      });
      return data;
    } catch (error) {
      return;
    }
  }
  public async getUserTransactions(userId: string) {
    try {
      const trades = await prisma.trades.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!trades.length) {
        return [];
      }
      const stockAddresses = [
        ...new Set(trades.map((trade) => trade.stockAddress)),
      ];
      const stocks = await prisma.stocks.findMany({
        where: {
          tokenAddress: {
            in: stockAddresses,
          },
        },
      });

      const stockMap = new Map(
        stocks.map((stock) => [stock.tokenAddress, stock]),
      );

      return trades.map((trade) => {
        const stock = stockMap.get(trade.stockAddress);

        return {
          id: trade.id,
          type: trade.tradeType,

          stock: {
            address: trade.stockAddress,
            symbol: stock?.symbol ?? null,
            name: stock?.name ?? null,
            imageUrl: stock?.imageUrl ?? null,
          },

          price: trade.stockPrice,
          amount: trade.investmentAmount,

          createdAt: trade.createdAt,
        };
      });
    } catch (error) {
      console.error("Failed to fetch user transactions:", error);
      throw error;
    }
  }
}

interface loginForm {
  interestedStocks: string[];
  amountToPutIn: number;
  question1: string;
  question2: string;
}

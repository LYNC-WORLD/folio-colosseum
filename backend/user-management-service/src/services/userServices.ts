import { prisma } from "../lib/prisma";
import { getWalletTokens } from "../lib/solana";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export class UserService {
  public async getBalance(walletAddress: string) {
    try {
      const tokenDetails = await getWalletTokens(walletAddress);
      if(!tokenDetails){
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
          };
        }),
      };
      return result;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

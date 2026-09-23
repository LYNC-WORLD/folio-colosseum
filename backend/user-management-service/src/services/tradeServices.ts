import { prisma } from "../lib/prisma";
import { privy } from "../lib/privy";

// const responce = await privy.wallets().swaps().quote(walletId, {
//   destination: {
//     asset_address: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX",
//   },
//   source: {
//     asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//     caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
//   },
//   base_amount: "5010000000",
//   amount_type: "exact_input",
// });
const XSTOCKS_API = "https://api.xstocks.fi/api/v2";

export class TradeService {
  public async getQuote(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      if (!price || !usdcAmount) {
        return;
      }
      if (!usdcAmount && stockAmount) {
        usdcAmount = price * stockAmount;
      }
      const qoute = await privy
        .wallets()
        .swaps()
        .quote(walletId, {
          destination: {
            asset_address: stockAddress,
          },
          source: {
            asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          base_amount: String(usdcAmount * 1000000),
          amount_type: "exact_input",
        });
        // qoute.
        return qoute;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}
async function getStockPrice(walletSymbol: string) {
  try {
    const url = `${XSTOCKS_API}/public/assets/${encodeURIComponent(
      walletSymbol,
    )}/price-data`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch ${walletSymbol}: ${response.status}`);
      return;
    }
    const data = (await response.json()) as XStocksPriceResponse;
    if (data.quote === undefined || data.quote === null) {
      console.error(`No price returned for ${walletSymbol}`);
      return;
    }
    return data.quote;
  } catch (error) {
    console.error(error);
    return;
  }
}
interface XStocksPriceResponse {
  quote?: number;
  [key: string]: any;
}

import { env } from "../config/env";
import { privy } from "../lib/privy";

const XSTOCKS_API = "https://api.xstocks.fi/api/v2";

export class TradeService {
  public async getQuoteBuy(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (stockAmount) {
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
      return qoute;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getQuoteSell(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (!stockAmount) {
        stockAmount = usdcAmount / price;
      }
      const qoute = await privy
        .wallets()
        .swaps()
        .quote(walletId, {
          destination: {
            asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          },
          source: {
            asset_address: stockAddress,
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          base_amount: String(stockAmount * 100000000),
          amount_type: "exact_input",
        });
      // qoute.
      return qoute;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async buyStock(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (stockAmount) {
        usdcAmount = stockAmount * price;
      }
      const responce = await privy
        .wallets()
        .swaps()
        .execute(walletId, {
          destination: {
            asset_address: stockAddress,
          },
          source: {
            asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          base_amount: String(usdcAmount * 1000000),
          amount_type: "exact_input",
          authorization_context: {authorization_private_keys: [env.PRIVY_AUTH_KEY!]},
          fee_configuration: {type: "total_fee_bps", value: 0}
        });
      // qoute.
      return responce;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async sellStock(
    stockAddress: string,
    stockSymbol: string,
    stockAmount: number | undefined,
    usdcAmount: number | undefined,
    walletId: string,
    userId: string,
  ) {
    try {
      const price = await getStockPrice(stockSymbol);
      console.log("price: ", price);
      if (!price) {
        return;
      }
      if (!usdcAmount) usdcAmount = 0;
      if (!stockAmount) {
        stockAmount = usdcAmount / price;
      }
      const responce = await privy
        .wallets()
        .swaps()
        .execute(walletId, {
          destination: {
            asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          },
          source: {
            asset_address: stockAddress,
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          base_amount: String(stockAmount * 100000000),
          amount_type: "exact_input",
          authorization_context: {authorization_private_keys: [env.PRIVY_AUTH_KEY!]}
        });
      return responce;
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

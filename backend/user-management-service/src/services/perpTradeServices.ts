import { ExchangeClient } from "@nktkas/hyperliquid";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import {
  getTransectionResults,
  privy,
  buyStockOnChain,
  sellStockOnChain,
} from "../lib/privy";
import { getUSDCBalance } from "../lib/solana";
import { decrypt } from "../utils/encryption";
import {
  getBestPriceFromOrderBook,
  hyperliquidInfoClient,
  hyperliquidTransport,
} from "../lib/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";
import { response } from "express";

export class PerpTradeService {
  public async placeMarketOrder(
    ethereumWalletId: string,
    assetSymbol: string,
    assetId: number,
    dollarSize: number,
    leverage: number,
    sizeDecimal: number,
    isBuy: boolean,
  ) {
    try {
      const walletDetails = await prisma.wallet.findFirst({
        where: { walletId: ethereumWalletId },
        include: {
          hyperLiquidDetails: true,
        },
      });
      if (!walletDetails || !walletDetails.hyperLiquidDetails) {
        return {
          success: false,
          message: "Hyperliquid details not found",
        };
      }
      const apiSecret = decrypt(
        walletDetails.hyperLiquidDetails.agentApiSecret,
      );
      const wallet = privateKeyToAccount(apiSecret as `0x${string}`);
      // Hyperliquid client
      const client = new ExchangeClient({
        transport: hyperliquidTransport,
        wallet,
      });
      // update leverage
      const leverageUpdated = await client.updateLeverage({
        asset: assetId,
        isCross: true,
        leverage: leverage,
      });
      if (!(leverageUpdated.status == "ok")) {
        return {
          success: false,
          message: "Error updating leverage",
        };
      }
      // get latest price
      const price = await getBestPriceFromOrderBook(assetSymbol, isBuy);
      if (!price)
        return { success: false, message: "Error getting latest price" };
      const size = (dollarSize * leverage) / Number(price);
      const marketOrder = await client.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            p: formatPrice(price, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: false,
            t: { limit: { tif: "FrontendMarket" } },
          },
        ],
        grouping: "na",
      });
      return {
        success: marketOrder.status == "ok",
        message: "Order placed",
        response: marketOrder.response,
      };
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async placeLimitOrder(
    ethereumWalletId: string,
    assetSymbol: string,
    assetId: number,
    dollarSize: number,
    limitPrice: number,
    leverage: number,
    sizeDecimal: number,
    isBuy: boolean,
  ) {
    try {
      const walletDetails = await prisma.wallet.findFirst({
        where: { walletId: ethereumWalletId },
        include: {
          hyperLiquidDetails: true,
        },
      });
      if (!walletDetails || !walletDetails.hyperLiquidDetails) {
        return {
          success: false,
          message: "Hyperliquid details not found",
        };
      }
      const apiSecret = decrypt(
        walletDetails.hyperLiquidDetails.agentApiSecret,
      );
      const wallet = privateKeyToAccount(apiSecret as `0x${string}`);
      // Hyperliquid client
      const client = new ExchangeClient({
        transport: hyperliquidTransport,
        wallet,
      });
      // update leverage
      const leverageUpdated = await client.updateLeverage({
        asset: assetId,
        isCross: true,
        leverage: leverage,
      });
      if (!(leverageUpdated.status == "ok")) {
        return {
          success: false,
          message: "Error updating leverage",
        };
      }
      // get latest price
      const price = await getBestPriceFromOrderBook(assetSymbol, isBuy);
      if (!price)
        return { success: false, message: "Error getting latest price" };
      if ((isBuy && price < limitPrice) || (!isBuy && price > limitPrice)) {
        return {
          success: false,
          message: "Invalid limit price",
        };
      }
      const size = (dollarSize * leverage) / Number(price);
      const limitOrder = await client.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            p: formatPrice(limitPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: false,
            t: { limit: { tif: "FrontendMarket" } },
          },
        ],
        grouping: "na",
      });
      return {
        success: limitOrder.status == "ok",
        message: "Order placed",
        response: limitOrder.response,
      };
    } catch (error) {
      console.error(error);
      return;
    }
  }

    public async getOpenOrders(
    ethereumAddress: string,
  ) {
    try {
      const orders = await hyperliquidInfoClient.openOrders({user: ""});
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

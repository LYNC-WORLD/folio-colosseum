import { ExchangeClient, OrderStatusResponse } from "@nktkas/hyperliquid";
import { prisma } from "../lib/prisma";
import { decrypt } from "../utils/encryption";
import {
  getBestPriceFromOrderBook,
  hyperliquidInfoClient,
  hyperliquidTransport,
} from "../lib/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";

export class PerpTradeService {
  public async placeMarketOrder(
    ethereumWalletId: string,
    assetSymbol: string,
    assetId: number,
    dollarSize: number,
    leverage: number,
    sizeDecimal: number,
    isBuy: boolean,
    tpsl?: TpSlInterface,
  ) {
    try {
      let grouping: "na" | "normalTpsl" | "positionTpsl" = "na";
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
      const priceData = await getBestPriceFromOrderBook(assetSymbol, isBuy);
      if (!priceData)
        return { success: false, message: "Error getting latest price" };
      // Calculate size
      const size = (dollarSize * leverage) / Number(priceData.orderBookPrice);
      let batchOrder: any[] = [
        {
          a: assetId,
          b: isBuy,
          p: formatPrice(priceData.limitPrice, sizeDecimal),
          s: formatSize(size, sizeDecimal),
          r: false,
          t: { limit: { tif: "Ioc" } },
        },
      ];
      // TP SL Order creation
      if (tpsl) {
        if (tpsl.TpPrice || tpsl.TpPercentage) {
          const tpTriggerPrice =
            tpsl.TpPrice ??
            (priceData.orderBookPrice *
              (100 +
                ((isBuy ? 1 : -1) * (tpsl.TpPercentage ?? 0)) / leverage)) /
              100;
          const tpOrderPrice =
            (priceData.orderBookPrice *
              (100 +
                ((isBuy ? -1 : 1) * (tpsl.TpPercentage ?? 0)) / leverage)) /
            100;
          batchOrder.push({
            a: assetId,
            b: !isBuy,
            p: formatPrice(tpOrderPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: true,
            t: {
              trigger: {
                isMarket: true,
                triggerPx: formatPrice(tpTriggerPrice, sizeDecimal),
                tpsl: "tp",
              },
            },
          });
          grouping = "normalTpsl";
        }
        if (tpsl.SlPrice || tpsl.SlPercentage) {
          const slTriggerPrice =
            tpsl.SlPrice ??
            (priceData.orderBookPrice *
              (100 +
                ((isBuy ? -1 : 1) * (tpsl.SlPercentage ?? 0)) / leverage)) /
              100;
          const slOrderPrice =
            (priceData.orderBookPrice *
              (100 +
                ((isBuy ? 1 : -1) * (tpsl.SlPercentage ?? 0)) / leverage)) /
            100;
          batchOrder.push({
            a: assetId,
            b: !isBuy,
            p: formatPrice(slOrderPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: true,
            t: {
              trigger: {
                isMarket: true,
                triggerPx: formatPrice(slTriggerPrice, sizeDecimal),
                tpsl: "sl",
              },
            },
          });
          grouping = "normalTpsl";
        }
      }
      // Placing batch order
      console.log(JSON.stringify(batchOrder));

      const marketOrder = await client.order({
        orders: batchOrder,
        grouping: grouping,
      });
      // Checking if market order got filled
      const firstOrder = marketOrder.response.data.statuses[0];
      if (typeof firstOrder === "object" && "filled" in firstOrder) {
        return {
          success: true,
          message: "Order placed",
          response: marketOrder.response,
        };
      } else {
        return {
          success: false,
          message: "Order not placed",
          response: marketOrder.response,
        };
      }
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
    tpsl?: TpSlInterface,
  ) {
    try {
      let grouping: "na" | "normalTpsl" | "positionTpsl" = "na";
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
      const priceData = await getBestPriceFromOrderBook(assetSymbol, isBuy);
      if (!priceData)
        return { success: false, message: "Error getting latest price" };
      if (
        (isBuy && priceData.orderBookPrice < limitPrice) ||
        (!isBuy && priceData.orderBookPrice > limitPrice)
      ) {
        return {
          success: false,
          message: "Invalid limit price",
        };
      }
      const size = (dollarSize * leverage) / Number(limitPrice);
      let batchOrder: any[] = [
        {
          a: assetId,
          b: isBuy,
          p: formatPrice(limitPrice, sizeDecimal),
          s: formatSize(size, sizeDecimal),
          r: false,
          t: { limit: { tif: "Gtc" } },
        },
      ];
      if (tpsl) {
        if (tpsl.TpPrice || tpsl.TpPercentage) {
          const tpTriggerPrice =
            tpsl.TpPrice ??
            (limitPrice *
              (100 +
                ((isBuy ? 1 : -1) * (tpsl.TpPercentage ?? 0)) / leverage)) /
              100;
          const tpOrderPrice =
            (limitPrice *
              (100 +
                ((isBuy ? -1 : 1) * (tpsl.TpPercentage ?? 0)) / leverage)) /
            100;
          batchOrder.push({
            a: assetId,
            b: !isBuy,
            p: formatPrice(tpOrderPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: true,
            t: {
              trigger: {
                isMarket: true,
                triggerPx: formatPrice(tpTriggerPrice, sizeDecimal),
                tpsl: "tp",
              },
            },
          });
        }
        if (tpsl.SlPrice || tpsl.SlPercentage) {
          const slTriggerPrice =
            tpsl.SlPrice ??
            (limitPrice *
              (100 +
                ((isBuy ? -1 : 1) * (tpsl.SlPercentage ?? 0)) / leverage)) /
              100;
          const slOrderPrice =
            (limitPrice *
              (100 +
                ((isBuy ? 1 : -1) * (tpsl.SlPercentage ?? 0)) / leverage)) /
            100;
          batchOrder.push({
            a: assetId,
            b: !isBuy,
            p: formatPrice(slOrderPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: true,
            t: {
              trigger: {
                isMarket: true,
                triggerPx: formatPrice(slTriggerPrice, sizeDecimal),
                tpsl: "sl",
              },
            },
          });
        }
        grouping = "normalTpsl";
      }
      console.log(JSON.stringify(batchOrder));
      const limitOrder = await client.order({
        orders: batchOrder,
        grouping: grouping,
      });
      console.log(JSON.stringify(limitOrder));

      return {
        success: limitOrder.status == "ok",
        message: "Order placed",
        response: limitOrder.response,
      };
    } catch (error) {
      console.error(JSON.stringify(error));
      return;
    }
  }

  public async cancelOrder(
    ethereumWalletId: string,
    orderId: string,
    assetId: string,
  ) {
    try {
      const walletDetails = await prisma.wallet.findFirst({
        where: { walletId: ethereumWalletId },
        include: {
          hyperLiquidDetails: true,
        },
      });
      if (!walletDetails || !walletDetails.hyperLiquidDetails) {
        return;
      }
      const apiSecret = decrypt(
        walletDetails.hyperLiquidDetails.agentApiSecret,
      );
      const wallet = privateKeyToAccount(apiSecret as `0x${string}`);
      const client = new ExchangeClient({
        transport: hyperliquidTransport,
        wallet,
      });
      const cancelOrder = await client.cancelByCloid({
        cancels: [{ asset: assetId, cloid: orderId }],
      });
      return cancelOrder;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getOpenOrders(ethereumAddress: string) {
    try {
      const orders = await hyperliquidInfoClient.openOrders({
        user: ethereumAddress,
        dex: "xyz",
      });
      let orderDetails: OrderStatusResponse[] = [];
      orders.forEach(async (order) => {
        const orderDetail = await hyperliquidInfoClient.orderStatus({
          user: ethereumAddress,
          oid: order.oid,
        });
        orderDetails.push(orderDetail);
      });
      return orderDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getOrdersBySymbol(ethereumAddress: string, stock: string) {
    try {
      const orders = await hyperliquidInfoClient.openOrders({
        user: ethereumAddress,
        dex: "xyz",
      });
      const stockOrder = orders.filter(
        (order) => order.coin.split(":").pop() === stock,
      );

      let orderDetails: OrderStatusResponse[] = [];
      stockOrder.forEach(async (order) => {
        const orderDetail = await hyperliquidInfoClient.orderStatus({
          user: ethereumAddress,
          oid: order.oid,
        });
        orderDetails.push(orderDetail);
      });
      return orderDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getAllPositions(ethereumAddress: string) {
    try {
      const data = await hyperliquidInfoClient.clearinghouseState({
        user: ethereumAddress,
      });
      console.log(data);
      return data.assetPositions;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async getPositionBySymbol(ethereumAddress: string, stock: string) {
    try {
      const data = await hyperliquidInfoClient.clearinghouseState({
        user: ethereumAddress,
      });
      const marketDetails = data.assetPositions.find((asset) => {
        const coin = asset.position.coin;

        const stockSymbol = coin.split(":").pop();

        return stockSymbol === stock;
      });

      return marketDetails;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

export interface TpSlInterface {
  TpPrice?: number;
  SlPrice?: number;
  TpPercentage?: number;
  SlPercentage?: number;
}

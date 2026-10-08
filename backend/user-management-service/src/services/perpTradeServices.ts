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
    marginMode: "ISOLATED" | "CROSS",
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
        isCross: marginMode == "CROSS",
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
    marginMode: "ISOLATED" | "CROSS",
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
        isCross: marginMode == "CROSS",
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
          grouping = "normalTpsl";
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
          grouping = "normalTpsl";
        }
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
    assetSymbol: string,
  ) {
    try {
      const markerSymbol =
        assetSymbol.split(":")[assetSymbol.split(":").length - 1];
      const [walletDetails, assetDetails] = await Promise.all([
        prisma.wallet.findFirst({
          where: { walletId: ethereumWalletId },
          include: {
            hyperLiquidDetails: true,
          },
        }),
        prisma.perpStocks.findFirst({
          where: { marketSymbol: markerSymbol },
        }),
      ]);
      if (
        !walletDetails ||
        !walletDetails.hyperLiquidDetails ||
        !assetDetails
      ) {
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
      const cancelOrder = await client.cancel({
        cancels: [{ a: Number(assetDetails.assetId), o: orderId }],
      });
      return cancelOrder;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async closePosition(
    walletId: string,
    ethereumAddress: string,
    stockSymbol: string,
  ) {
    try {
      const [stockDetails, openPosition, walletDetails] = await Promise.all([
        prisma.perpStocks.findFirst({
          where: {
            marketSymbol: stockSymbol,
          },
        }),
        this.getPositionBySymbol(ethereumAddress, stockSymbol),
        prisma.wallet.findFirst({
          where: {
            walletId: walletId,
          },
          include: {
            hyperLiquidDetails: true,
          },
        }),
      ]);
      if (
        !stockDetails ||
        !openPosition ||
        !walletDetails ||
        !walletDetails.hyperLiquidDetails
      )
        return;
      const assetId = stockDetails.assetId;
      const isBuy = Number(openPosition.position.szi) < 0 ? true : false;
      const size = Math.abs(Number(openPosition.position.szi));
      const priceData = await getBestPriceFromOrderBook(stockSymbol, isBuy);
      if (!priceData) return;
      const apiSecret = decrypt(
        walletDetails.hyperLiquidDetails.agentApiSecret,
      );
      const wallet = privateKeyToAccount(apiSecret as `0x${string}`);

      const client = new ExchangeClient({
        transport: hyperliquidTransport,
        wallet,
      });

      const closePosition = await client.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            p: formatPrice(priceData.limitPrice, stockDetails.szDecimals),
            r: false,
            s: formatSize(size, stockDetails.szDecimals),
            t: {
              limit: {
                tif: "Ioc",
              },
            },
          },
        ],
        grouping: "na",
      });
      const firstOrder = closePosition.response.data.statuses[0];
      if (typeof firstOrder === "object" && "filled" in firstOrder) {
        return {
          success: true,
          message: "Order filled",
          response: closePosition.response,
        };
      } else {
        return {
          success: false,
          message: "Order not filled",
          response: closePosition.response,
        };
      }
    } catch (error) {
      console.error(error);
      return;
    }
  }

  public async placeTPSL(
    walletId: string,
    ethereumAddress: string,
    stockSymbol: string,
    orderSize: string | undefined,
    tpsl: TpSlInterface,
  ) {
    try {
      const [stockDetails, openPosition, walletDetails] = await Promise.all([
        prisma.perpStocks.findFirst({
          where: {
            marketSymbol: stockSymbol,
          },
        }),
        this.getPositionBySymbol(ethereumAddress, stockSymbol),
        prisma.wallet.findFirst({
          where: {
            walletId: walletId,
          },
          include: {
            hyperLiquidDetails: true,
          },
        }),
      ]);
      if (
        !stockDetails ||
        !openPosition ||
        !walletDetails ||
        !walletDetails.hyperLiquidDetails
      )
        return { success: false, message: "cant fetch details" };
      const assetId = stockDetails.assetId;
      const isBuy = Number(openPosition.position.szi) > 0 ? true : false;
      const size = orderSize ?? Math.abs(Number(openPosition.position.szi));
      const leverage = openPosition.position.leverage.value;
      const sizeDecimal = stockDetails.szDecimals;
      const averageFillPrice = Number(openPosition.position.entryPx);
      const priceData = await getBestPriceFromOrderBook(stockSymbol, isBuy);
      let grouping: "na" | "normalTpsl" | "positionTpsl" = "na";
      if (!priceData)
        return { success: false, messages: "can not fetch orderbook" };
      const apiSecret = decrypt(
        walletDetails.hyperLiquidDetails.agentApiSecret,
      );
      const wallet = privateKeyToAccount(apiSecret as `0x${string}`);

      const client = new ExchangeClient({
        transport: hyperliquidTransport,
        wallet,
      });
      let batchOrder: any[] = [];
      if (
        tpsl.TpPrice &&
        (isBuy
          ? tpsl.TpPrice < priceData.orderBookPrice
          : tpsl.TpPrice > priceData.orderBookPrice)
      ) {
        return {
          success: false,
          message: "invalid TP details (order will  be filled immediately)",
        };
      }
      if (
        tpsl.SlPrice &&
        (isBuy
          ? tpsl.SlPrice > priceData.orderBookPrice
          : tpsl.SlPrice < priceData.orderBookPrice)
      ) {
        return {
          success: false,
          message: "invalid SL details (order will  be filled immediately)",
        };
      }
      if (tpsl.TpPrice || tpsl.TpPercentage) {
        const tpTriggerPrice =
          tpsl.TpPrice ??
          (averageFillPrice *
            (100 + ((isBuy ? 1 : -1) * (tpsl.TpPercentage ?? 0)) / leverage)) /
            100;
        const tpOrderPrice =
          (priceData.orderBookPrice *
            (100 + ((isBuy ? -1 : 1) * (tpsl.TpPercentage ?? 0)) / leverage)) /
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
          (averageFillPrice *
            (100 + ((isBuy ? -1 : 1) * (tpsl.SlPercentage ?? 0)) / leverage)) /
            100;
        const slOrderPrice =
          (priceData.orderBookPrice *
            (100 + ((isBuy ? 1 : -1) * (tpsl.SlPercentage ?? 0)) / leverage)) /
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
      if (batchOrder.length == 2) {
        grouping = "na";
      }
      const tpslOrders = await client.order({
        orders: batchOrder,
        grouping: grouping,
      });

      return {
        success: true,
        message: "Order places",
        data: tpslOrders.response.data.statuses,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "something went wrong",
      };
    }
  }

  public async getOpenOrders(ethereumAddress: string) {
    try {
      const orders = await hyperliquidInfoClient.openOrders({
        user: ethereumAddress,
        dex: "xyz",
      });
      const orderDetails = await Promise.all(
        orders.map((order) =>
          hyperliquidInfoClient.orderStatus({
            user: ethereumAddress,
            oid: order.oid,
          }),
        ),
      );
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

      const orderDetails = await Promise.all(
        orders.map((order) =>
          hyperliquidInfoClient.orderStatus({
            user: ethereumAddress,
            oid: order.oid,
          }),
        ),
      );
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
        dex: "xyz",
      });
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
        dex: "xyz",
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

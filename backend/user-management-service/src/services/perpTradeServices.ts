import { ExchangeClient } from "@nktkas/hyperliquid";
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
      const client = await exchangeClientFor(ethereumWalletId);
      if (!client) {
        return {
          success: false,
          message: "Hyperliquid details not found",
        };
      }
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
      const priceData = await getBestPriceFromOrderBook(assetSymbol, isBuy);
      if (!priceData)
        return { success: false, message: "Error getting latest price" };
      const size = (dollarSize * leverage) / Number(priceData.orderBookPrice);
      const tpslOrders = tpsl
        ? buildTpSlOrders(
            assetId,
            isBuy,
            size,
            sizeDecimal,
            leverage,
            priceData.orderBookPrice,
            priceData.orderBookPrice,
            tpsl,
          )
        : [];
      const marketOrder = await client.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            p: formatPrice(priceData.limitPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: false,
            t: { limit: { tif: "Ioc" } },
          },
          ...tpslOrders,
        ],
        grouping: tpslOrders.length ? "normalTpsl" : "na",
      });
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
      const client = await exchangeClientFor(ethereumWalletId);
      if (!client) {
        return {
          success: false,
          message: "Hyperliquid details not found",
        };
      }
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
      const tpslOrders = tpsl
        ? buildTpSlOrders(
            assetId,
            isBuy,
            size,
            sizeDecimal,
            leverage,
            limitPrice,
            limitPrice,
            tpsl,
          )
        : [];
      const limitOrder = await client.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            p: formatPrice(limitPrice, sizeDecimal),
            s: formatSize(size, sizeDecimal),
            r: false,
            t: { limit: { tif: "Gtc" } },
          },
          ...tpslOrders,
        ],
        grouping: tpslOrders.length ? "normalTpsl" : "na",
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

  public async cancelOrder(
    ethereumWalletId: string,
    orderId: string,
    assetSymbol: string,
  ) {
    try {
      const markerSymbol = assetSymbol.split(":").pop();
      const [client, assetDetails] = await Promise.all([
        exchangeClientFor(ethereumWalletId),
        prisma.perpStocks.findFirst({
          where: { marketSymbol: markerSymbol },
        }),
      ]);
      if (!client || !assetDetails) {
        return { success: false, message: "cant fetch details" };
      }
      const cancelOrder = await client.cancel({
        cancels: [{ a: Number(assetDetails.assetId), o: Number(orderId) }],
      });
      return {
        success: true,
        message: "Order cancelled",
        response: cancelOrder,
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Order not cancelled" };
    }
  }

  public async closePosition(
    walletId: string,
    ethereumAddress: string,
    stockSymbol: string,
  ) {
    try {
      const [stockDetails, openPosition, client] = await Promise.all([
        prisma.perpStocks.findFirst({
          where: {
            marketSymbol: stockSymbol,
          },
        }),
        this.getPositionBySymbol(ethereumAddress, stockSymbol),
        exchangeClientFor(walletId),
      ]);
      if (!stockDetails || !openPosition || !client)
        return { success: false, message: "no open position" };
      const assetId = stockDetails.assetId;
      const isBuy = Number(openPosition.position.szi) < 0;
      const size = Math.abs(Number(openPosition.position.szi));
      const priceData = await getBestPriceFromOrderBook(stockSymbol, isBuy);
      if (!priceData)
        return { success: false, message: "can not fetch orderbook" };

      const closePosition = await client.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            p: formatPrice(priceData.limitPrice, stockDetails.szDecimals),
            r: true,
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
      const [stockDetails, openPosition, client] = await Promise.all([
        prisma.perpStocks.findFirst({
          where: {
            marketSymbol: stockSymbol,
          },
        }),
        this.getPositionBySymbol(ethereumAddress, stockSymbol),
        exchangeClientFor(walletId),
      ]);
      if (!stockDetails || !openPosition || !client)
        return { success: false, message: "cant fetch details" };
      const isBuy = Number(openPosition.position.szi) > 0;
      const size = orderSize ?? Math.abs(Number(openPosition.position.szi));
      const priceData = await getBestPriceFromOrderBook(stockSymbol, isBuy);
      if (!priceData)
        return { success: false, message: "can not fetch orderbook" };
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
      const tpslOrders = await client.order({
        orders: buildTpSlOrders(
          stockDetails.assetId,
          isBuy,
          size,
          stockDetails.szDecimals,
          openPosition.position.leverage.value,
          Number(openPosition.position.entryPx),
          priceData.orderBookPrice,
          tpsl,
        ),
        grouping: orderSize ? "na" : "positionTpsl",
      });

      return {
        success: true,
        message: "Order placed",
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
        stockOrder.map((order) =>
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

async function exchangeClientFor(ethereumWalletId: string) {
  const details = await prisma.hyperLiquidDetails.findUnique({
    where: { walletId: ethereumWalletId },
  });
  if (!details) return;
  const wallet = privateKeyToAccount(
    decrypt(details.agentApiSecret) as `0x${string}`,
  );
  return new ExchangeClient({ transport: hyperliquidTransport, wallet });
}

function buildTpSlOrders(
  assetId: number | string,
  isBuy: boolean,
  size: number | string,
  sizeDecimal: number,
  leverage: number,
  triggerBasePrice: number,
  orderBasePrice: number,
  tpsl: TpSlInterface,
) {
  const side = isBuy ? 1 : -1;
  const movedPrice = (base: number, percent: number | undefined, sign: number) =>
    (base * (100 + (sign * (percent ?? 0)) / leverage)) / 100;
  const triggerOrder = (
    triggerPx: number,
    orderPx: number,
    kind: "tp" | "sl",
  ) => ({
    a: assetId,
    b: !isBuy,
    p: formatPrice(orderPx, sizeDecimal),
    s: formatSize(size, sizeDecimal),
    r: true,
    t: {
      trigger: {
        isMarket: true,
        triggerPx: formatPrice(triggerPx, sizeDecimal),
        tpsl: kind,
      },
    },
  });

  const orders = [];
  if (tpsl.TpPrice || tpsl.TpPercentage) {
    orders.push(
      triggerOrder(
        tpsl.TpPrice ?? movedPrice(triggerBasePrice, tpsl.TpPercentage, side),
        movedPrice(orderBasePrice, tpsl.TpPercentage, -side),
        "tp",
      ),
    );
  }
  if (tpsl.SlPrice || tpsl.SlPercentage) {
    orders.push(
      triggerOrder(
        tpsl.SlPrice ?? movedPrice(triggerBasePrice, tpsl.SlPercentage, -side),
        movedPrice(orderBasePrice, tpsl.SlPercentage, side),
        "sl",
      ),
    );
  }
  return orders;
}

export interface TpSlInterface {
  TpPrice?: number;
  SlPrice?: number;
  TpPercentage?: number;
  SlPercentage?: number;
}

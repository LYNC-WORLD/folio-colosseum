import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { PerpTradeService, TpSlInterface } from "../services/perpTradeServices";

export class PerpTradeController {
  private perpTradeService: PerpTradeService;

  constructor() {
    this.perpTradeService = new PerpTradeService();
  }

  public marketOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const order = await parseOrder(req.body, false);
      if (order.error !== undefined) {
        res.status(order.status).json({ success: false, message: order.error });
        return;
      }
      const responce = await this.perpTradeService.placeMarketOrder(
        req.user.ethereumWalletId,
        order.stockSymbol,
        order.assetId,
        order.dollarSize,
        order.leverage,
        order.margin,
        order.szDecimals,
        order.isBuy,
        order.tpsl,
      );
      sendResult(res, responce, "Order not placed");
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public limitOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const order = await parseOrder(req.body, true);
      if (order.error !== undefined) {
        res.status(order.status).json({ success: false, message: order.error });
        return;
      }
      const responce = await this.perpTradeService.placeLimitOrder(
        req.user.ethereumWalletId,
        order.stockSymbol,
        order.assetId,
        order.dollarSize,
        order.limitPrice,
        order.leverage,
        order.margin,
        order.szDecimals,
        order.isBuy,
        order.tpsl,
      );
      sendResult(res, responce, "Order not placed");
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public cancelOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: cancelOrder = req.body;
      if (!body.assetSymbol || !Number.isInteger(Number(body.orderId))) {
        res.status(400).json({
          success: false,
          message: "assetSymbol and orderId is required",
        });
        return;
      }
      const cancelOrder = await this.perpTradeService.cancelOrder(
        req.user.ethereumWalletId,
        body.orderId,
        body.assetSymbol,
      );
      res.status(cancelOrder.success ? 200 : 400).json({
        success: cancelOrder.success,
        message: cancelOrder.message,
        data: cancelOrder.response,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public closePosition = async (req: Request, res: Response): Promise<void> => {
    try {
      if (
        !req.user ||
        !req.user.solanaWalletId ||
        !req.user.ethereumWalletId ||
        !req.user.ethereumWalletAddress
      ) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: closePosition = req.body;
      if (!body.stockSymbol) {
        res.status(400).json({
          success: false,
          message: "stockSymbol is required",
        });
        return;
      }
      const closePosition = await this.perpTradeService.closePosition(
        req.user.ethereumWalletId,
        req.user.ethereumWalletAddress,
        body.stockSymbol,
      );
      res.status(closePosition ? (closePosition.success ? 200 : 400) : 500).json({
        success: closePosition?.success ?? false,
        message: closePosition?.message ?? "Position not closed",
        data: closePosition,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public placeTpSlOrder = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (
        !req.user ||
        !req.user.solanaWalletId ||
        !req.user.ethereumWalletId ||
        !req.user.ethereumWalletAddress
      ) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: TpSlOrder = req.body;
      if (
        !body.tpPrice &&
        !body.slPrice &&
        !body.tpPercent &&
        !body.slPercent
      ) {
        res.status(400).json({
          success: false,
          message: "tpsl Order details required",
        });
        return;
      }
      const tpsl = parseTpSl(body);
      if (!body.stockSymbol || !tpsl || (body.orderSize && !isPositive(Number(body.orderSize)))) {
        res.status(400).json({
          success: false,
          message: "stockSymbol is required; orderSize and tp/sl values must be positive, either percent or price",
        });
        return;
      }
      const tpslOrder = await this.perpTradeService.placeTPSL(
        req.user.ethereumWalletId,
        req.user.ethereumWalletAddress,
        body.stockSymbol,
        body.orderSize || undefined,
        tpsl,
      );
      res.status(tpslOrder.success ? 200 : 400).json({
        success: tpslOrder.success,
        message: tpslOrder.message,
        data: tpslOrder,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getOpenOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const orders = await this.perpTradeService.getOpenOrders(
        req.user.ethereumWalletAddress!,
      );
      res.status(200).json({
        success: true,
        message: "Open orders",
        data: orders,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getOrderBySymbol = async (
    req: Request<{ stock: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const stock = req.params.stock;
      const orders = await this.perpTradeService.getOrdersBySymbol(
        req.user.ethereumWalletAddress!,
        stock,
      );
      res.status(200).json({
        success: true,
        message: "Open orders",
        data: orders,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getAllPositions = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const positions = await this.perpTradeService.getAllPositions(
        req.user.ethereumWalletAddress!,
      );
      res.status(200).json({
        success: true,
        message: "Open positions",
        data: positions,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getPositionBySymbol = async (
    req: Request<{ stock: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.solanaWalletId || !req.user.ethereumWalletId) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const stock = req.params.stock;
      const positions = await this.perpTradeService.getPositionBySymbol(
        req.user.ethereumWalletAddress!,
        stock,
      );
      res.status(200).json({
        success: true,
        message: "Position Details",
        data: positions,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

const isPositive = (value: number) => Number.isFinite(value) && value > 0;
const optionalNumber = (value: unknown) => (value ? Number(value) : undefined);

function parseTpSl(body: TpSlFields): TpSlInterface | undefined {
  const tpsl = {
    TpPrice: optionalNumber(body.tpPrice),
    SlPrice: optionalNumber(body.slPrice),
    TpPercentage: optionalNumber(body.tpPercent),
    SlPercentage: optionalNumber(body.slPercent),
  };
  const values = Object.values(tpsl).filter((value) => value !== undefined);
  if (!values.every(isPositive)) return;
  if ((tpsl.TpPrice && tpsl.TpPercentage) || (tpsl.SlPrice && tpsl.SlPercentage)) return;
  return tpsl;
}

async function parseOrder(body: OrderBody, needsLimitPrice: boolean) {
  const dollarSize = Number(body.dollarSize);
  const leverage = Number(body.leverage);
  const limitPrice = Number(body.limitPrice);
  const margin = body.margin ?? "ISOLATED";
  if (
    !body.stockSymbol ||
    typeof body.isBuy !== "boolean" ||
    !isPositive(dollarSize) ||
    !Number.isInteger(leverage) ||
    leverage < 1 ||
    (needsLimitPrice && !isPositive(limitPrice)) ||
    (margin !== "CROSS" && margin !== "ISOLATED")
  ) {
    return {
      status: 400,
      error: `dollarSize, isBuy, stockSymbol${needsLimitPrice ? ", limitPrice" : ""} and leverage is required; margin must be CROSS or ISOLATED`,
    };
  }
  const tpsl = parseTpSl(body);
  if (!tpsl) {
    return { status: 400, error: "tp/sl must be positive, either percent or price" };
  }
  const stock = await prisma.perpStocks.findFirst({
    select: { assetId: true, szDecimals: true, maxLeverage: true },
    where: { marketSymbol: body.stockSymbol },
  });
  if (!stock) return { status: 404, error: "Perp stock not found" };
  if (leverage > stock.maxLeverage) {
    return { status: 400, error: `leverage greater than max limit ${stock.maxLeverage}` };
  }
  return {
    stockSymbol: body.stockSymbol,
    assetId: Number(stock.assetId),
    szDecimals: stock.szDecimals,
    dollarSize,
    leverage,
    limitPrice,
    margin,
    isBuy: body.isBuy,
    tpsl,
  };
}

function sendResult(
  res: Response,
  result: { success: boolean; message: string; response?: unknown } | undefined,
  fallbackMessage: string,
) {
  res.status(result ? (result.success ? 200 : 400) : 500).json({
    success: result?.success ?? false,
    message: result?.message ?? fallbackMessage,
    data: result?.response,
  });
}

interface TpSlFields {
  tpPrice?: number | string;
  slPrice?: number | string;
  tpPercent?: number | string;
  slPercent?: number | string;
}

interface OrderBody extends TpSlFields {
  stockSymbol: string;
  dollarSize: number | string;
  leverage: number | string;
  isBuy: boolean;
  limitPrice?: number | string;
  margin?: "ISOLATED" | "CROSS";
}

interface cancelOrder {
  assetSymbol: string;
  orderId: string;
}

interface closePosition {
  stockSymbol: string;
}

interface TpSlOrder extends TpSlFields {
  stockSymbol: string;
  orderSize: string | undefined;
}

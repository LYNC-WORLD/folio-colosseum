import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { PerpTradeService } from "../services/perpTradeServices";

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
      const body: placeMarketOrder = req.body;
      if (
        !body.dollarSize ||
        !body.isBuy ||
        !body.leverage ||
        !body.stockSymbol
      ) {
        res.status(400).json({
          success: false,
          message: "dollarSize, isBuy, stockSymbol and leverage is required",
        });
        return;
      }
      if (body.leverage > 10) {
        res.status(400).json({
          success: false,
          message: "leverage greated then max limit",
        });
        return;
      }
      const result = await prisma.perpStocks.findFirst({
        select: {
          assetId: true,
          szDecimals: true,
        },
        where: {
          marketSymbol: body.stockSymbol,
        },
      });
      if (!result?.assetId || !result?.szDecimals) {
        res.status(500).json({
          success: false,
          message: "Error fetching perp stock details",
        });
        return;
      }
      const responce = await this.perpTradeService.placeMarketOrder(
        req.user.ethereumWalletId,
        body.stockSymbol,
        Number(result?.assetId),
        body.dollarSize,
        body.leverage,
        result?.szDecimals,
        body.isBuy,
      );
      if (responce?.success) {
        res.status(200).json({
          success: true,
          message: responce.message,
          data: responce.response,
        });
        return;
      } else {
        res.status(200).json({
          success: false,
          message: responce!.message ?? "",
        });
        return;
      }
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
      const body: placeLimitOrder = req.body;
      if (
        !body.dollarSize ||
        !body.isBuy ||
        !body.leverage ||
        !body.stockSymbol ||
        !body.limitPrice
      ) {
        res.status(400).json({
          success: false,
          message:
            "dollarSize, isBuy, stockSymbol, limitPrice and leverage is required",
        });
        return;
      }
      if (body.leverage > 10) {
        res.status(400).json({
          success: false,
          message: "leverage greated then max limit",
        });
        return;
      }
      const result = await prisma.perpStocks.findFirst({
        select: {
          assetId: true,
          szDecimals: true,
        },
        where: {
          marketSymbol: body.stockSymbol,
        },
      });
      if (!result?.assetId || !result?.szDecimals) {
        res.status(500).json({
          success: false,
          message: "Error fetching perp stock details",
        });
        return;
      }
      const responce = await this.perpTradeService.placeLimitOrder(
        req.user.ethereumWalletId,
        body.stockSymbol,
        Number(result?.assetId),
        body.dollarSize,
        body.limitPrice,
        body.leverage,
        result?.szDecimals,
        body.isBuy,
      );
      if (responce?.success) {
        res.status(200).json({
          success: true,
          message: responce.message,
          data: responce.response,
        });
        return;
      } else {
        res.status(200).json({
          success: false,
          message: responce!.message ?? "",
        });
        return;
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  
}

interface placeMarketOrder {
  stockSymbol: string;
  dollarSize: number;
  leverage: number | undefined;
  isBuy: boolean;
}

interface placeLimitOrder {
  stockSymbol: string;
  dollarSize: number;
  leverage: number | undefined;
  isBuy: boolean;
  limitPrice: number;
}

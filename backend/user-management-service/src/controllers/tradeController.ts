import { Request, Response } from "express";
import { TradeService } from "../services/tradeServices";
import { prisma } from "../lib/prisma";

export class TradeController {
  private tradeService: TradeService;

  constructor() {
    this.tradeService = new TradeService();
  }

  public getQuoteBuy = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;
      if (
        (body.stockAmount && body.usdcAmount) ||
        (!body.stockAmount && !body.usdcAmount) ||
        !body.stockSymbol ||
        !body.stockAddress
      ) {
        res.status(400).json({
          success: false,
          message:
            "(stockAmount or usdcAmount), stockSymbol and stockAddress is required",
        });
        return;
      }
      const stockDetails = await prisma.stocks.findUnique({
        select: {
          decimals: true,
          stockType: true,
        },
        where: {
          tokenAddress: body.stockAddress,
        },
      });
      const quote = await this.tradeService.getQuoteBuy(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        stockDetails?.stockType ?? "USStock",
      );
      if (!quote) {
        res.status(404).json({
          success: true,
          message: "can not fetch stocks",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Quote details",
        data: {
          stockAddress: body.stockAddress,
          stockSymbol: body.stockSymbol,
          inputUSDC: Number(quote?.input_amount) / 1000000,
          outputStocks:
            Number(quote?.est_output_amount) /
            10 ** (stockDetails?.decimals ?? 8),
        },
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  public getQuoteSell = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;
      if (
        (body.stockAmount && body.usdcAmount) ||
        (!body.stockAmount && !body.usdcAmount) ||
        !body.stockSymbol ||
        !body.stockAddress
      ) {
        res.status(400).json({
          success: false,
          message:
            "stockAmount, usdcAmount, stockSymbol and stockAddress is required",
        });
        return;
      }

      const stockDetails = await prisma.stocks.findUnique({
        select: {
          decimals: true,
          stockType: true,
        },
        where: {
          tokenAddress: body.stockAddress,
        },
      });
      const quote = await this.tradeService.getQuoteSell(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
        stockDetails?.decimals ?? 8,
        stockDetails?.stockType ?? "USStock",
      );
      if (!quote) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Quote details",
        data: {
          stockAddress: body.stockAddress,
          stockSymbol: body.stockSymbol,
          outputUSDC: Number(quote?.est_output_amount) / 1000000,
          inputStocks:
            Number(quote?.input_amount) / 10 ** (stockDetails?.decimals ?? 8),
        },
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  public buyStocks = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;
      if (
        (body.stockAmount && body.usdcAmount) ||
        (!body.stockAmount && !body.usdcAmount) ||
        !body.stockSymbol ||
        !body.stockAddress
      ) {
        res.status(400).json({
          success: false,
          message:
            "(stockAmount or usdcAmount), stockSymbol and stockAddress is required",
        });
        return;
      }
      const stockDetails = await prisma.stocks.findUnique({
        select: {
          decimals: true,
          stockType: true,
        },
        where: {
          tokenAddress: body.stockAddress,
        },
      });
      const responce = await this.tradeService.buyStock(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
        stockDetails?.stockType ?? "USStock",
      );
      if (!responce) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
      }
      if (responce.status == "rejected" || responce.status == "failed") {
        res.status(500).json({
          success: false,
          message: "transection failed",
          status: responce.status,
        });
      }
      res.status(200).json({
        success: true,
        message: "Quote details",
        status: responce.status,
        data: responce.responce,
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  public sellStocks = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;

      console.log("body: ", body);
      if (
        (body.stockAmount && body.usdcAmount) ||
        (!body.stockAmount && !body.usdcAmount) ||
        !body.stockSymbol ||
        !body.stockAddress
      ) {
        res.status(400).json({
          success: false,
          message:
            "stockAmount, usdcAmount, stockSymbol and stockAddress is required",
        });
        return;
      }
      const stockDecimal = await prisma.stocks.findUnique({
        select: {
          decimals: true,
        },
        where: {
          tokenAddress: body.stockAddress,
        },
      });
      console.log("stockDecimal: ", stockDecimal);
      const stockDetails = await prisma.stocks.findUnique({
        select: {
          decimals: true,
          stockType: true,
        },
        where: {
          tokenAddress: body.stockAddress,
        },
      });
      const responce = await this.tradeService.sellStock(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
        stockDetails?.decimals ?? 8,
        stockDetails?.stockType ?? "USStock",
      );
      if (!responce) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
      }
      if (responce.status == "rejected" || responce.status == "failed") {
        res.status(500).json({
          success: false,
          message: "transection failed",
          status: responce.status,
        });
      }
      res.status(200).json({
        success: true,
        message: "sell responce",
        status: responce.status,
        data: responce.responce,
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  public startRecurringBuy = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: recurringBuyRequest = req.body;
      if (Number(body.buyDate) > 31 || Number(body.buyDate) < 1) {
        res.status(400).json({
          success: false,
          message: "invalid buy date",
        });
        return;
      }
      if (
        (body.stockAmount && body.usdcAmount) ||
        (!body.stockAmount && !body.usdcAmount) ||
        !body.stockAddress ||
        !body.buyDate
      ) {
        res.status(400).json({
          success: false,
          message:
            "stockAmount, usdcAmount, buyDate and stockAddress is required",
        });
        return;
      }
      const responce = await this.tradeService.startRecurringBuy(
        body.stockAddress,
        body.stockAmount,
        body.usdcAmount,
        body.buyDate,
        req.user.userId,
      );
      if (!responce) {
        res.status(500).json({
          success: false,
          messgae: "request failed",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "recurring buy scheduled",
        data: responce,
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  public buyIndexFunds = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body = req.body as buyOrSellIndexFunds;
      if (
        (body.indexFundAmount && body.usdcAmount) ||
        (!body.indexFundAmount && !body.usdcAmount) ||
        !body.indexFundId
      ) {
        res.status(400).json({
          success: false,
          message:
            "indexFundAmount, usdcAmount and indexFundAddress is required",
        });
        return;
      }
      const responce = await this.tradeService.buyIndexFunds(
        body.indexFundId,
        body.indexFundAmount,
        body.usdcAmount,
        req.user.walletId,
      );
      if (!responce) {
        res.status(500).json({
          success: false,
          messgae: "request failed",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "index funds bought",
        data: responce,
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  public sellIndexFunds = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body = req.body as buyOrSellIndexFunds;
      if (
        (body.indexFundAmount && body.usdcAmount) ||
        (!body.indexFundAmount && !body.usdcAmount) ||
        !body.indexFundId
      ) {
        res.status(400).json({
          success: false,
          message:
            "indexFundAmount, usdcAmount and indexFundAddress is required",
        });
        return;
      }
      const responce = await this.tradeService.sellIndexFunds(
        body.indexFundId,
        body.indexFundAmount,
        body.usdcAmount,
        req.user.walletId,
      );
      if (!responce) {
        res.status(500).json({
          success: false,
          messgae: "request failed",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Index fund sold",
        data: responce,
      });
      return;
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

interface getQuoteRequest {
  stockAddress: string;
  stockSymbol: string;
  usdcAmount: number | undefined;
  stockAmount: number | undefined;
}

interface buyOrSellIndexFunds {
  indexFundId: string;
  usdcAmount: number | undefined;
  indexFundAmount: number | undefined;
}
interface recurringBuyRequest {
  stockAddress: string;
  usdcAmount: string | undefined;
  stockAmount: string | undefined;
  buyDate: string;
}

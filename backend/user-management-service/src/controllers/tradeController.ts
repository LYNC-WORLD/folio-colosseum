import { Request, Response } from "express";
import { TradeService } from "../services/tradeServices";

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
      const quote = await this.tradeService.getQuoteBuy(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
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
          outputStocks: Number(quote?.est_output_amount) / 100000000,
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
      const quote = await this.tradeService.getQuoteSell(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
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
          outputUSDC: Number(quote?.est_output_amount) / 1000000,
          inputStocks: Number(quote?.input_amount) / 100000000,
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
      const responce = await this.tradeService.buyStock(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
      );
      if (!responce) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
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
      const responce = await this.tradeService.sellStock(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
      );
      if (!responce) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
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
}

interface getQuoteRequest {
  stockAddress: string;
  stockSymbol: string;
  usdcAmount: number | undefined;
  stockAmount: number | undefined;
}

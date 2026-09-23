import { Request, Response } from "express";
import { TradeService } from "../services/tradeServices";

export class TradeController {
  private tradeService: TradeService;

  constructor() {
    this.tradeService = new TradeService();
  }

  public getQuote = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;
      if ((!body.stockAmount && !body.usdcAmount) || !body.stockSymbol || !body.stockAddress) {
        res.status(400).json({
          success: false,
          message: "stockAmount, usdcAmount, stockSymbol and stockAddress is required",
        });
        return;
      }
      const quote = await this.tradeService.getQuote(
        body.stockAddress,
        body.stockSymbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.walletId,
        req.user.userId,
      );
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

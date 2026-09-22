import { Request, Response } from "express";
import { TradeService } from "../services/tradeServices";

export class TradeController {
  private tradeService: TradeService;

  constructor() {
    this.tradeService = new TradeService();
  }

  public getQuote = async (req: Request, res: Response): Promise<void> => {
    try {
      const stocks = await this.tradeService.getQuote();
      if (!stocks) {
        res.status(500).json({
          success: false,
          message: "Internal server error: error fetching stocks",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "stocks list",
        data: stocks,
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

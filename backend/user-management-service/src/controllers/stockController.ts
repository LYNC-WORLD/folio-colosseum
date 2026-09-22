import { Request, Response } from "express";
import { StockService } from "../services/stockServices";

export class StockController {
  private stockService: StockService;

  constructor() {
    this.stockService = new StockService();
  }

  public getStocks = async (req: Request, res: Response): Promise<void> => {
    try {
      const stocks = await this.stockService.getStocks();
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

  public getStockBySymbol = async (
    req: Request<{ stockSymbol: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const stock: string = req.params.stockSymbol;
      if (!stock) {
        res.status(500).json({
          success: false,
          message: "No stock provided",
        });
        return;
      }
      const stockDetails = await this.stockService.getStockById(stock);
      if (stockDetails == undefined || stockDetails == null) {
        res.status(404).json({
          success: false,
          message: "Stock not found",
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "stocks list",
        data: stockDetails,
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

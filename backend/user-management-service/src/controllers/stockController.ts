import { Request, Response } from "express";
import { StockService } from "../services/stockServices";

export class StockController {
  private stockService: StockService;

  constructor() {
    this.stockService = new StockService();
  }

  public getUSStocks = async (req: Request, res: Response): Promise<void> => {
    try {
      const stocks = await this.stockService.getUSStocks();
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

  public getUSStockBySymbol = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { stockSymbol } = req.params;

      if (!stockSymbol || Array.isArray(stockSymbol)) {
        res.status(400).json({
          success: false,
          message: "Invalid stock symbol",
        });
        return;
      }

      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const stockDetails = await this.stockService.getStockDetails(
        stockSymbol,
        userId,
      );

      if (!stockDetails) {
        res.status(404).json({
          success: false,
          message: "Stock not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Stock details fetched successfully",
        data: stockDetails,
      });
    } catch (error) {
      console.error("Get stock details error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getPreIPOs = async (req: Request, res: Response): Promise<void> => {
    try {
      const stocks = await this.stockService.getPreIPO();
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

  public getPreIPOsBySymbol = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { stockSymbol } = req.params;

      if (!stockSymbol || Array.isArray(stockSymbol)) {
        res.status(400).json({
          success: false,
          message: "Invalid stock symbol",
        });
        return;
      }

      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const stockDetails = await this.stockService.getStockDetails(
        stockSymbol,
        userId,
      );

      if (!stockDetails) {
        res.status(404).json({
          success: false,
          message: "Stock not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Stock details fetched successfully",
        data: stockDetails,
      });
    } catch (error) {
      console.error("Get stock details error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getLatestBuy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { stockAddress } = req.query;

      if (!stockAddress || typeof stockAddress !== "string") {
        res.status(400).json({
          success: false,
          message: "stockAddress is required",
        });
        return;
      }

      const trades = await this.stockService.getLatestBuy(stockAddress);

      res.status(200).json({
        success: true,
        message: "Latest 3 buys fetched successfully",
        data: trades,
      });
    } catch (error) {
      console.error("Get latest buys error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public getIndexFunds = async (req: Request, res: Response): Promise<void> => {
    try {
      const indexFunds = await this.stockService.getIndexFunds();

      res.status(200).json({
        success: true,
        message: "list of index funds",
        data: indexFunds,
      });
    } catch (error) {
      console.error("can not fetch index funds:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

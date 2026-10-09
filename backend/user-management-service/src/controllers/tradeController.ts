import { Request, Response } from "express";
import { TradeService, TradeSwapResult } from "../services/tradeServices";
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
      if (invalidAmounts(body.stockAmount, body.usdcAmount) || !body.stockAddress) {
        res.status(400).json({
          success: false,
          message: "(stockAmount or usdcAmount) and stockAddress is required",
        });
        return;
      }
      const stockDetails = await findStock(body.stockAddress);
      if (!stockDetails) {
        res.status(404).json({
          success: false,
          message: "stock not found",
        });
        return;
      }
      const quote = await this.tradeService.getQuoteBuy(
        body.stockAddress,
        stockDetails.symbol,
        body.stockAmount,
        body.usdcAmount,
        stockDetails.stockType,
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
          stockSymbol: stockDetails.symbol,
          inputUSDC: Number(quote.inAmount) / 1000000,
          outputStocks:
            Number(quote.outAmount) / 10 ** stockDetails.decimals,
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
      if (invalidAmounts(body.stockAmount, body.usdcAmount) || !body.stockAddress) {
        res.status(400).json({
          success: false,
          message: "(stockAmount or usdcAmount) and stockAddress is required",
        });
        return;
      }
      const stockDetails = await findStock(body.stockAddress);
      if (!stockDetails) {
        res.status(404).json({
          success: false,
          message: "stock not found",
        });
        return;
      }
      const quote = await this.tradeService.getQuoteSell(
        body.stockAddress,
        stockDetails.symbol,
        body.stockAmount,
        body.usdcAmount,
        stockDetails.decimals,
        stockDetails.stockType,
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
          stockSymbol: stockDetails.symbol,
          outputUSDC: Number(quote.outAmount) / 1000000,
          inputStocks:
            Number(quote.inAmount) / 10 ** stockDetails.decimals,
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
      if (!req.user || !req.user.solanaWalletId || !req.user.solanaWalletAddress) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;
      if (invalidAmounts(body.stockAmount, body.usdcAmount) || !body.stockAddress) {
        res.status(400).json({
          success: false,
          message: "(stockAmount or usdcAmount) and stockAddress is required",
        });
        return;
      }
      const stockDetails = await findStock(body.stockAddress);
      if (!stockDetails) {
        res.status(404).json({
          success: false,
          message: "stock not found",
        });
        return;
      }
      const responce = await this.tradeService.buyStock(
        body.stockAddress,
        stockDetails.symbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.solanaWalletId,
        req.user.solanaWalletAddress,
        req.user.userId,
        stockDetails.stockType,
        stockDetails.decimals,
      );
      if (!responce) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
      }
      if (responce.status === "failed") {
        respondSwapFailure(res, responce);
        return;
      }
      res.status(200).json({
        success: true,
        message: "Quote details",
        status: responce.status,
        data: responce.data,
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
      if (!req.user || !req.user.solanaWalletId || !req.user.solanaWalletAddress) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: getQuoteRequest = req.body;
      if (invalidAmounts(body.stockAmount, body.usdcAmount) || !body.stockAddress) {
        res.status(400).json({
          success: false,
          message: "(stockAmount or usdcAmount) and stockAddress is required",
        });
        return;
      }
      const stockDetails = await findStock(body.stockAddress);
      if (!stockDetails) {
        res.status(404).json({
          success: false,
          message: "stock not found",
        });
        return;
      }
      const responce = await this.tradeService.sellStock(
        body.stockAddress,
        stockDetails.symbol,
        body.stockAmount,
        body.usdcAmount,
        req.user.solanaWalletId,
        req.user.solanaWalletAddress,
        req.user.userId,
        stockDetails.decimals,
        stockDetails.stockType,
      );
      if (!responce) {
        res.status(404).json({
          success: false,
          message: "can not fetch stocks",
        });
        return;
      }
      if (responce.status === "failed") {
        respondSwapFailure(res, responce);
        return;
      }
      res.status(200).json({
        success: true,
        message: "sell responce",
        status: responce.status,
        data: responce.data,
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
      const buyDate = Number(body.buyDate);
      if (!Number.isInteger(buyDate) || buyDate > 31 || buyDate < 1) {
        res.status(400).json({
          success: false,
          message: "invalid buy date",
        });
        return;
      }
      if (
        invalidAmounts(body.stockAmount, body.usdcAmount) ||
        !body.stockAddress
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
        String(buyDate),
        req.user.userId,
      );
      if (!responce) {
        res.status(500).json({
          success: false,
          message: "request failed",
        });
        return;
      }
      if ("error" in responce) {
        res.status(400).json({
          success: false,
          message: responce.error,
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
      if (!req.user || !req.user.solanaWalletId || !req.user.solanaWalletAddress) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body = req.body as buyOrSellIndexFunds;
      if (invalidAmounts(body.indexFundAmount, body.usdcAmount) || !body.indexFundId) {
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
        req.user.solanaWalletId,
        req.user.id,
        req.user.solanaWalletAddress,
      );
      if (!responce) {
        res.status(500).json({
          success: false,
          message: "request failed",
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
      if (!req.user || !req.user.solanaWalletId || !req.user.solanaWalletAddress) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body = req.body as buyOrSellIndexFunds;
      if (invalidAmounts(body.indexFundAmount, body.usdcAmount) || !body.indexFundId) {
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
        req.user.solanaWalletId,
        req.user.id,
        req.user.solanaWalletAddress,
      );
      if (!responce) {
        res.status(500).json({
          success: false,
          message: "request failed",
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

function respondSwapFailure(res: Response, result: Extract<TradeSwapResult, { status: "failed" }>) {
  const kind = result.kind;
  if (kind === "unconfirmed") {
    res.status(202).json({
      success: false,
      message: "Swap submitted but not confirmed yet, check your balance before retrying",
      requestId: result.requestId,
      signature: result.signature,
    });
    return;
  }
  if (kind === "rate_limited") {
    res.status(429).json({
      success: false,
      message: "Jupiter rate limited, try again shortly",
      code: result.code,
    });
    return;
  }
  if (kind === "insufficient_sol") {
    res.status(400).json({
      success: false,
      message: "Insufficient SOL for network fees",
      code: result.code,
    });
    return;
  }
  if (kind === "below_gasless_minimum") {
    res.status(400).json({
      success: false,
      message: "Swap amount below Jupiter gasless minimum",
      code: result.code,
    });
    return;
  }
  if (kind === "insufficient_funds") {
    res.status(400).json({
      success: false,
      message: "Insufficient token balance for this swap",
      code: result.code,
    });
    return;
  }
  res.status(500).json({
    success: false,
    message: result.error ?? "transection failed",
    code: result.code,
    kind,
  });
}

function invalidAmounts(amount: unknown, usdcAmount: unknown) {
  if (!amount === !usdcAmount) return true;
  const value = Number(amount || usdcAmount);
  return !Number.isFinite(value) || value <= 0;
}

function findStock(stockAddress: string) {
  return prisma.stocks.findUnique({
    select: {
      decimals: true,
      stockType: true,
      symbol: true,
    },
    where: {
      tokenAddress: stockAddress,
    },
  });
}

interface getQuoteRequest {
  stockAddress: string;
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

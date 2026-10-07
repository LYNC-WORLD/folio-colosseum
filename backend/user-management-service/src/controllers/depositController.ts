import { Request, Response } from "express";
import { DepositService } from "../services/depositServices";

export class DepositController {
  private depositService: DepositService;
  constructor() {
    this.depositService = new DepositService();
  }
  public createDepositRequest = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (
        !req.user ||
        !req.user.solanaWalletId ||
        !req.user.ethereumWalletId ||
        !req.user.solanaWalletAddress ||
        !req.user.ethereumWalletAddress
      ) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const body: DepositRequestBody = req.body;

      if (!body.depositAmount) {
        res.status(400).json({
          success: false,
          message: "Deposit amount required",
        });
        return;
      }
      if (Number(body.depositAmount) < 20) {
        res.status(400).json({
          success: false,
          message: "minimum deposit amount is $20",
        });
        return;
      }
      const depositRequest = await this.depositService.createDepositRequest(
        req.user.id,
        body.depositAmount,
        req.user.solanaWalletAddress,
        req.user.solanaWalletId,
        req.user.ethereumWalletAddress,
        req.user.ethereumWalletId,
      );
      res.status(200).json({
        success: depositRequest,
        message: "Request submitted",
      });
      return;
    } catch (error) {
      console.log("login error: ", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  public checkDepositStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (
        !req.user ||
        !req.user.solanaWalletId ||
        !req.user.ethereumWalletId ||
        !req.user.solanaWalletAddress ||
        !req.user.ethereumWalletAddress
      ) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }
      const depositRequest = await this.depositService.checkDepositRequest(
        req.user.id,
      );
      res.status(200).json({
        success: depositRequest,
        message: "Deposit status",
      });
      return;
    } catch (error) {
      console.log("login error: ", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

interface DepositRequestBody {
  depositAmount: string;
}

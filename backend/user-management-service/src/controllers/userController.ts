import { Request, Response } from "express";
import { UserService } from "../services/userServices";
import { AuthenticatedRequest } from "../types/express";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public getBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "can not find wallet",
        });
        return;
      }
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) {
        res.status(404).json({
          success: false,
          message: "can not find wallet",
        });
        return;
      }
      const userBalance = await this.userService.getBalance(walletAddress);
      if (!userBalance) {
        res.status(404).json({ success: false, message: "No stocks found" });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Stock Details",
        data: userBalance,
      });
      return;
    } catch (error) {
      // console.log(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}
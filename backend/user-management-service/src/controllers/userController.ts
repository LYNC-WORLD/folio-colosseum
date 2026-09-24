import { Request, Response } from "express";
import { UserService } from "../services/userServices";

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

  public setLoginFormDetails = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "can not find user",
        });
        return;
      }
      const formData = req.body as loginForm;
      const data = await this.userService.setLoginFormData(
        req.user.email,
        formData
      );
      if (!data) {
        res
          .status(500)
          .json({ success: false, message: "something wend wrong" });
        return;
      }
      res.status(200).json({
        success: true,
        message: "data saved",
        data: data,
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

  public getRecurringBuyRequests = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(404).json({
          success: false,
          message: "can not find user",
        });
        return;
      }
      const data = await this.userService.getRecurrentBuyRequest(
        req.user.userId,
      );
      if (!data) {
        res
          .status(404)
          .json({ success: false, message: "No recurrent buy request found" });
        return;
      }
      res.status(200).json({
        success: true,
        message: "recurrent buy request details",
        data: data,
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

interface loginForm{
  interestedStocks: string[];
  amountToPutIn: number;
  question1: string;
  question2: string; 
}
import { Request, Response } from "express";
import { UserService } from "../services/userServices";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public getBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      // const walletAddress = req.user.
      // if (!stocks) {
      //   res.status(500).json({
      //     success: false,
      //     message: "Internal server error: error fetching stocks",
      //   });
      //   return;
      // }
      // res.status(200).json({
      //   success: true,
      //   message: "stocks list",
      //   data: stocks,
      // });
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

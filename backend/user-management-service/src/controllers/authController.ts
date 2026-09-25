import { Request, Response } from "express";
import { AuthService } from "../services/authServices";

export class AuthController {
  private authService: AuthService;
  constructor() {
    this.authService = new AuthService();
  }
  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken } = req.body;
      console.log(idToken);
      
      if(!idToken) {
        res.status(400).json({
          success: false,
          message: "Access token required"
        });
      }
      const user = await this.authService.getOrCreateUser(idToken);
      if(!user){
        res.status(401).json({
          success: false,
          message: "Wrong Access token"
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "user details",
        data: user
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

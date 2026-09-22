import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const userController = new UserController();

router.post("/get-balance", authMiddleware,  userController.getBalance);

export { router as tradeRoutes };
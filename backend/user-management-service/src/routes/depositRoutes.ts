import { Router } from "express";
import { DepositController } from "../controllers/depositController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const depositController = new DepositController();

router.post("/spot-to-perp", authMiddleware, depositController.createDepositRequest);

router.get("/check-deposit-status", authMiddleware, depositController.checkDepositStatus);

export { router as depositRoute };
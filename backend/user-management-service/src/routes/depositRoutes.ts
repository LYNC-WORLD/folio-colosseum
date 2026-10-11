import { Router } from "express";
import { DepositController } from "../controllers/depositController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const depositController = new DepositController();

router.post("/spot-to-perp", authMiddleware, depositController.createDepositRequest);

router.get("/check-deposit-status", authMiddleware, depositController.checkDepositStatus);

router.post("/perp-to-spot", authMiddleware, depositController.createWithdrawRequest);

router.get("/check-withdraw-status", authMiddleware, depositController.checkWithdrawStatus);

export { router as depositRoute };
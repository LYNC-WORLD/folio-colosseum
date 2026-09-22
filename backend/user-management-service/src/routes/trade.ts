import { Router } from "express";
import { TradeController } from "../controllers/tradeController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const tradeController = new TradeController();

router.post("/get-quote", authMiddleware, tradeController.getQuote);

export { router as tradeRoutes };
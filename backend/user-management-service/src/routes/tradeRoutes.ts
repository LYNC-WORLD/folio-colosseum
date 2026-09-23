import { Router } from "express";
import { TradeController } from "../controllers/tradeController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const tradeController = new TradeController();

router.post("/get-quote-buy", authMiddleware, tradeController.getQuoteBuy);
router.post("/get-quote-sell", authMiddleware, tradeController.getQuoteSell);

router.post("/stock-buy", authMiddleware, tradeController.buyStocks);
router.post("/stock-sell", authMiddleware, tradeController.sellStocks);

export { router as tradeRoutes };
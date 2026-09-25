import { Router } from "express";
import { TradeController } from "../controllers/tradeController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const tradeController = new TradeController();

router.post("/get-quote-buy", authMiddleware, tradeController.getQuoteBuy);
router.post("/get-quote-sell", authMiddleware, tradeController.getQuoteSell);

router.post("/stock-buy", authMiddleware, tradeController.buyStocks);
router.post("/stock-sell", authMiddleware, tradeController.sellStocks);

router.post("/start-recurring-buy", authMiddleware, tradeController.startRecurringBuy);

router.post("/buy-index-funds", authMiddleware, tradeController.buyIndexFunds);
router.post("/sell-index-funds", authMiddleware, tradeController.sellIndexFunds);

export { router as tradeRoutes };
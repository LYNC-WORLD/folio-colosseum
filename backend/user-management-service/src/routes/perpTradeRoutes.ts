import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { PerpTradeController } from "../controllers/perpTradeController";

const router = Router();

const perpTradeController = new PerpTradeController();

router.post("/market-order", authMiddleware, perpTradeController.marketOrder);

router.post("/limit-order", authMiddleware, perpTradeController.limitOrder);

router.post("/cancel-order", authMiddleware, perpTradeController.cancelOrder);
// Cancel order
// TP / SL order create 

router.get("/open-orders", authMiddleware, perpTradeController.getOpenOrders);

router.get("/orders-by-symbol/:stock", authMiddleware, perpTradeController.getOrderBySymbol);

router.get("/positions", authMiddleware, perpTradeController.getAllPositions);

router.get("/positions-by-symbol/:stock", authMiddleware, perpTradeController.getPositionBySymbol);

export { router as perpTradeRoutes };
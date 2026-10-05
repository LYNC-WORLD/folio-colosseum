import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { PerpTradeController } from "../controllers/perpTradeController";

const router = Router();

const perpTradeController = new PerpTradeController();

router.post("/market-order", authMiddleware, perpTradeController.marketOrder);

router.post("/limit-order", authMiddleware, perpTradeController.limitOrder);

export { router as perpTradeRoutes };
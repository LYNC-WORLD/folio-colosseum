import { Router } from "express";
import { StockController } from "../controllers/stockController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const stockController = new StockController();

router.get("/us-stock", stockController.getUSStocks);

router.get("/us-stock/:stockSymbol", authMiddleware, stockController.getUSStockBySymbol);

router.get("/pre-ipo", authMiddleware, stockController.getPreIPOs);

router.get("/pre-ipo/:stockSymbol",authMiddleware, stockController.getPreIPOsBySymbol);

router.get("/trades,", stockController.getLatestBuy);

export { router as stockRoutes };

import { Router } from "express";
import { StockController } from "../controllers/stockController";

const router = Router();

const stockController = new StockController();

router.get("/", stockController.getStocks);

router.get("/:stockSymbol", stockController.getStockBySymbol);

router.get("/trades,", stockController.getLatestBuy);

export { router as stockRoutes };

import { Router } from "express";
import { TradeController } from "../controllers/tradeController";

const router = Router();

const tradeController = new TradeController();

router.post("/get-quote", tradeController.getQuote);

export { router as tradeRoutes };
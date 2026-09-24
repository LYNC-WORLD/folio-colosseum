import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const userController = new UserController();

router.get("/balance", authMiddleware, userController.getBalance);

router.get(
  "/recurring-buy-requests",
  authMiddleware,
  userController.getRecurringBuyRequests,
);
router.post(
  "/cancel-recurring-request",
  authMiddleware,
  userController.cancelRecurringBuyRequest,
);

router.post("/login-form", authMiddleware, userController.setLoginFormDetails);

router.get("/transactions", authMiddleware, userController.getUserTransactions);

export { router as userRoutes };

import { Router } from "express";
import { LeaderboardController } from "../controllers/leaderboardController";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
const leaderboardController = new LeaderboardController();

router.get("/perp", leaderboardController.getPerpLeaderboard);
router.get("/perp/me", authMiddleware, leaderboardController.getMyPerpRank);

export { router as leaderboardRoutes };

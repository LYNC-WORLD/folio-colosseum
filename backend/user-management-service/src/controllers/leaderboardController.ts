import { Request, Response } from "express";
import {
  getLeaderboard,
  getMyLeaderboardEntry,
} from "../services/perpLeaderboard.service";

export class LeaderboardController {
  public getPerpLeaderboard = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(
        100,
        Math.max(1, Number(req.query.limit) || 50),
      );
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const data = await getLeaderboard(limit, offset);
      res.status(200).json({
        success: true,
        message: "perp leaderboard",
        data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

  public getMyPerpRank = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "User not found" });
        return;
      }
      const { entry, neighbors, totalRanked } = await getMyLeaderboardEntry(
        req.user.id,
      );
      res.status(200).json({
        success: true,
        message: "my perp leaderboard entry",
        data: {
          rank: entry?.rank ?? null,
          returnPercent: entry?.returnPercent ?? null,
          accountValue: entry?.accountValue ?? null,
          netDepositsUsdc: entry?.netDepositsUsdc ?? null,
          totalRanked,
          refreshedAt: entry?.refreshedAt ?? null,
          neighbors: neighbors.map((row) => ({
            rank: row.rank,
            displayName: row.displayName,
            returnPercent: row.returnPercent,
            accountValue: row.accountValue,
          })),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
}

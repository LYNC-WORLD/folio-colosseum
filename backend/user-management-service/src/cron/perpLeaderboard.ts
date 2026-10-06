import cron from "node-cron";
import { refreshAllSnapshots } from "../services/perpLeaderboard.service";

export function startPerpLeaderboardCron() {
  cron.schedule("0 * * * *", async () => {
    console.log("[PerpLeaderboardCron] starting", new Date().toISOString());
    try {
      await refreshAllSnapshots();
    } catch (error) {
      console.error("[PerpLeaderboardCron] failed:", error);
    }
  });
  console.log("[PerpLeaderboardCron] scheduled hourly at :00");
}

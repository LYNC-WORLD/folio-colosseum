import cron from "node-cron";
import { refreshAllSnapshots } from "../services/perpLeaderboard.service";

let running = false;

export function startPerpLeaderboardCron() {
  cron.schedule("0 * * * *", async () => {
    if (running) return;
    running = true;
    console.log("[PerpLeaderboardCron] starting", new Date().toISOString());
    try {
      await refreshAllSnapshots();
    } catch (error) {
      console.error("[PerpLeaderboardCron] failed:", error);
    } finally {
      running = false;
    }
  });
  console.log("[PerpLeaderboardCron] scheduled hourly at :00");
}

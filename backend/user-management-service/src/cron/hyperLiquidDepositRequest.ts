import cron from "node-cron";
import { CheckDepositRequest } from "../services/hyperliquidDepositServices";

let running = false;

export function startPerpDepositCron() {
  cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    console.log("[DepositCron] starting", new Date().toISOString());
    try {
      await CheckDepositRequest();
      console.log("[DepositCron] completed");
    } catch (error) {
      console.error("[DepositCron] failed:", error);
    } finally {
      running = false;
    }
  });
}

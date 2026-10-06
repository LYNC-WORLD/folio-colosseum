import cron from "node-cron";
import { CheckDepositRequest } from "../services/hyperliquidDepositServices";

export function startPerpDepositCron() {
  cron.schedule("* * * * *", async () => {
    console.log("[DepositCron] starting", new Date().toISOString());
    try {
      await CheckDepositRequest();
      console.log("[DepositCron] completed");
    } catch (error) {
      console.error("[DepositCron] failed:", error);
    }
  });
}

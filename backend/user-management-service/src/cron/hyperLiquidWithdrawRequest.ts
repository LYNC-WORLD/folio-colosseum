import cron from "node-cron";
import { CheckWithdrawRequest } from "../services/hyperliquidDepositServices";

export function startPerpWithdrawCron() {
  cron.schedule("* * * * *", async () => {
    console.log("[WithdrawCron] starting", new Date().toISOString());
    try {
      await CheckWithdrawRequest();
      console.log("[WithdrawCron] completed");
    } catch (error) {
      console.error("[WithdrawCron] failed:", error);
    }
  });
}

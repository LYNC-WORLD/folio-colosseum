import cron from "node-cron";
import { updateDailyOpenPrices } from "../services/stockPrice.service";

// Runs Monday-Friday at 9:30 AM America/New_York time
export function dailyStartStockPriceCron(): void {
  cron.schedule(
    "30 9 * * 1-5",
    async () => {
      const startedAt = new Date();

      console.log(
        `[StockCron] Starting price update at ${startedAt.toISOString()}`,
      );

      try {
        await updateDailyOpenPrices();

        console.log("[StockCron] Price update completed successfully");
      } catch (error) {
        console.error("[StockCron] Price update failed:", error);
      }
    },
    {
      timezone: "America/New_York",
    },
  );

  console.log(
    "[StockCron] Scheduled: Monday-Friday at 9:30 AM America/New_York",
  );
}

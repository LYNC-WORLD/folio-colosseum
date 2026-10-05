import cron from "node-cron";
import { processRecurringBuys } from "../services/recurringBuyCron.service";

export function startRecurringBuyCron() {
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log("[RecurringBuyCron] starting", new Date().toISOString());
      try {
        await processRecurringBuys();
      } catch (error) {
        console.error("[RecurringBuyCron] failed:", error);
      }
    },
    { timezone: "America/New_York" },
  );
  console.log("[RecurringBuyCron] scheduled daily 10:00 America/New_York");
}

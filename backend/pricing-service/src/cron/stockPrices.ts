import cron from "node-cron";
import { updateStockPrices } from "../services/stockPrice.service";

export function startStockPriceCron() {
  // Every minute
  cron.schedule("/5 * * * *", async () => {
    console.log("Running stock price update...");

    await updateStockPrices();
  });

  console.log("Stock price cron started");
}
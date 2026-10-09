import cron from "node-cron";
import { updateStockPrices } from "../services/stockPrice.service";

let running = false;

export function startStockPriceCron() {
  cron.schedule("*/5 * * * *", async () => {
    if (running) return;
    running = true;
    console.log("Running stock price update... ", Date.now());

    try {
      await updateStockPrices();
    } finally {
      running = false;
    }
  });

  console.log("Stock price cron started");
}

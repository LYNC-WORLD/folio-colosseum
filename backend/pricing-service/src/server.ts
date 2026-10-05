import { startStockPriceCron } from "./cron/stockPrices";
import { dailyStartStockPriceCron } from "./cron/DailyStockPrice";

// Start cron
startStockPriceCron();
dailyStartStockPriceCron();

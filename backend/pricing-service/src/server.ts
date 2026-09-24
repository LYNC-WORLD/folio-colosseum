import express from "express";
import { startStockPriceCron } from "./cron/stockPrices";
import { PrismaClient } from "./generated/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { dailyStartStockPriceCron } from "./cron/DailyStockPrice";

const app = express();

dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

app.use(express.json());

// Start cron
startStockPriceCron();
dailyStartStockPriceCron();

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

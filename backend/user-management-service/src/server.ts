import express from "express";
import { env } from "./config/env";
import { startRecurringBuyCron } from "./cron/recurringBuy";
import { startPerpLeaderboardCron } from "./cron/perpLeaderboard";
import { startPerpDepositCron } from "./cron/hyperLiquidDepositRequest";

import {authRoute} from "./routes/authRoutes";
import { stockRoutes } from "./routes/stockRoutes";
import { tradeRoutes } from "./routes/tradeRoutes";
import { userRoutes } from "./routes/userRoutes";
import { perpTradeRoutes } from "./routes/perpTradeRoutes";
import { leaderboardRoutes } from "./routes/leaderboardRoutes";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Server is running"
  });
});

const PORT = env.PORT;

startRecurringBuyCron();
startPerpLeaderboardCron();
startPerpDepositCron();

app.use("/api/auth", authRoute);
app.use("/api/stocks", stockRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/perp-trade", perpTradeRoutes);
app.use("/api/user", userRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
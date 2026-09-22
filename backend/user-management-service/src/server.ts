import express from "express";
import { env } from "./config/env";

import {authRoute} from "./routes/auth";
import { stockRoutes } from "./routes/stock";
import { tradeRoutes } from "./routes/trade";
import { userRoutes } from "./routes/user";

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use("/api/auth", authRoute);
app.use("/api/stocks", stockRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/user", userRoutes);
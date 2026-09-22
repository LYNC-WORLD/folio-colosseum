import express from "express";
import { env } from "./config/env";
import { PrismaClient } from "./generated/client"; 
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { Connection } from "@solana/web3.js";

import {authRoute} from "./routes/auth";
import { stockRoutes } from "./routes/stock";
import { tradeRoutes } from "./routes/trade";
const app = express();

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export const solana = new Connection(
  env.RPC_URL!,
  "confirmed"
);

app.use(express.json());

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
app.use("/api/user", tradeRoutes);
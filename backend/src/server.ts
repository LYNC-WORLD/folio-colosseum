import express from "express";
import { env } from "./config/env";
import { PrismaClient } from "./generated/client"; 
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const app = express();

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

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
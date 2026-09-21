import { Router } from "express";
import { PrismaClient } from "../generated/client";

export function createStockRouter(prisma: PrismaClient) {
  const router = Router();

  router.post("/get-quote", async (req, res) => {});
}

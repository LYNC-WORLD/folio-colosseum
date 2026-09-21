import { Router } from "express";
import { PrismaClient } from "../generated/client";
import { createUser } from "../lib/privy";
import { AuthController } from "../controllers/authController";

const router = Router();

const authController = new AuthController();

router.post("/login", authController.createUser);

export { router as authRoute };
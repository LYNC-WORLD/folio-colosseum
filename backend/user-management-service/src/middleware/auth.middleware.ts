import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { verifyGoogleIdToken } from "../lib/google";
import { Chain } from "../generated/enums";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
      return;
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
      return;
    }

    // 1. Verify Google ID token
    const googleUser = await verifyGoogleIdToken(token);

    // 2. Find your application user
    const user = await prisma.user.findUnique({
      where: {
        googleSubjectId: googleUser.subjectId,
      },
      include: {
        wallets: true,
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }
    const solanaWallet = user.wallets.find(
      (wallet) => wallet.chain === Chain.SOLANA,
    );

    const ethWallet = user.wallets.find((wallet) => wallet.chain === Chain.ETH);

    const userData = {
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      googleSubjectId: user.googleSubjectId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      solanaWalletId: solanaWallet?.walletId,
      solanaWalletAddress: solanaWallet?.walletAddress,
      ethereumWalletId: ethWallet?.walletId,
      ethereumWalletAddress: ethWallet?.walletAddress,
    };
    // 3. Attach database user to request
    req.user = userData;

    // 4. Continue to controller
    next();
  } catch (error) {
    // console.error("Auth middleware error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired Google token",
    });
  }
}

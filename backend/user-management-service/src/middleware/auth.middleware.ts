import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { verifyGoogleIdToken } from "../lib/google";

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
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // 3. Attach database user to request
    req.user = user;

    // 4. Continue to controller
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired Google token",
    });
  }
}
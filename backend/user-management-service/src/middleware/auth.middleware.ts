// import { Request, Response, NextFunction } from "express";
// import { verityPrivyToken } from "../lib/privy";

// export interface AuthRequest extends Request {
//   privyUserId?: string;
// }

// export async function authMiddleware(
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader?.startsWith("Bearer ")) {
//       return res.status(401).json({
//         error: "Missing authorization token",
//       });
//     }

//     const token = authHeader.substring(7);

//     const claims: any = await verityPrivyToken(token);

//     req.privyUserId = claims.userId;

//     next();
//   } catch (error) {
//     console.error(error);

//     return res.status(401).json({
//       error: "Invalid authentication token",
//     });
//   }
// }
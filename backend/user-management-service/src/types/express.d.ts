import { User } from "../generated/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
      id: string,
      userId: string,
      email: string,
      name: string,
      googleSubjectId: string,
      createdAt: Date,
      updatedAt: Date,
      solanaWalletId: string | undefined,
      solanaWalletAddress: string | undefined,
      ethereumWalletId: string | undefined,
      ethereumWalletAddress: string | undefined,
    };
    }
  }
}
export {};
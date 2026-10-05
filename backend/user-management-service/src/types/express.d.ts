import { User } from "../generated/client";

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        solanaWalletId?: string;
        solanaWalletAddress?: string;
        ethereumWalletId?: string;
        ethereumWalletAddress?: string;
      };
    }
  }
}

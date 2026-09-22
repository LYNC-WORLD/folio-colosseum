import { User } from "../generated/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
export interface AuthenticatedRequest extends Request {
  user: User;
}
export {};
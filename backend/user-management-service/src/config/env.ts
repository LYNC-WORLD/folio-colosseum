import dotenv from "dotenv";

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT ?? "5000",
  RPC_URL: process.env.RPC_URL,
  PRIVY_APP_ID: process.env.PRIVY_APP_ID,
  PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  PRIVY_AUTH_KEY: process.env.PRIVY_AUTH_KEY,
  PRIVY_AUTH_ADDRESS: process.env.PRIVY_AUTH_ADDRESS
};

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required!!");
}
if (!env.RPC_URL) {
  throw new Error("RPC_URL is required!!");
}
if (!env.PRIVY_APP_ID) {
  throw new Error("DATABASE_URL is required!!");
}
if (!env.PRIVY_APP_SECRET) {
  throw new Error("RPC_URL is required!!");
}
if (!env.PRIVY_AUTH_KEY) {
  throw new Error("PRIVY_AUTH_KEY is required!!");
}
if (!env.PRIVY_AUTH_ADDRESS) {
  throw new Error("PRIVY_AUTH_KEY is required!!");
}
if (!env.GOOGLE_CLIENT_ID) {
  throw new Error("RPC_URL is required!!");
}
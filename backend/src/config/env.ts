import dotenv from "dotenv";

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT ?? "5000",
};

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required!!");
}

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
  PRIVY_AUTH_ADDRESS: process.env.PRIVY_AUTH_ADDRESS,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  JUPITER_API_KEY: process.env.JUPITER_API_KEY,
};

for (const [name, value] of Object.entries(env)) {
  if (!value) {
    throw new Error(`${name} is required!!`);
  }
}

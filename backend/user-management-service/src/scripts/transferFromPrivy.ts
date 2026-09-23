import { PrivyClient } from "@privy-io/node";
import dotenv from "dotenv";

dotenv.config();

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const walletId = "REDACTED_PRIVY_WALLET_ID";

const userJwt =
  "REDACTED_JWT";

const serverPublicKey = "REDACTED_PRIVY_KEY_ID";

async function transferUSDC() {
  const result = await privy.wallets().update(walletId, {
    owner: { public_key: serverPublicKey },
    authorization_context: {
      user_jwts: [userJwt],
    },
  });
  console.log(result);
}

transferUSDC().catch(console.error);

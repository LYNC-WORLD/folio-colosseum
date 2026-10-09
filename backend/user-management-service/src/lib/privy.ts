import { PrivyClient } from "@privy-io/node";
import { env } from "../config/env";

export const privy = new PrivyClient({
  appId: env.PRIVY_APP_ID!,
  appSecret: env.PRIVY_APP_SECRET!,
});

export async function createUser(
  googleSubjectId: string,
  mail: string,
  name: string,
) {
  try {
    const user = await privy.users().create({
      linked_accounts: [
        {
          type: "google_oauth",
          subject: googleSubjectId,
          email: mail,
          name: name,
        },
      ],
    });
    return {
      userId: user.id,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
export async function deleteUser(userId: string) {
  try {
    await privy.users().delete(userId);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function createSolanaWallet(
  idempotencyKey?: string,
): Promise<createWallet> {
  try {
    const solanaWallet = await privy.wallets().create({
      chain_type: "solana",
      owner_id: env.PRIVY_AUTH_ADDRESS!,
      idempotency_key: idempotencyKey,
    });
    return {
      walletId: solanaWallet.id,
      address: solanaWallet.address,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
export async function createEVMWallet(
  idempotencyKey?: string,
): Promise<createWallet> {
  try {
    const evmWallet = await privy.wallets().create({
      chain_type: "ethereum",
      owner_id: env.PRIVY_AUTH_ADDRESS!,
      idempotency_key: idempotencyKey,
    });
    return {
      walletId: evmWallet.id,
      address: evmWallet.address,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
export async function getTransectionResults(
  walletId: string,
  transectionId: string,
  timeoutMs = 60_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const data = await privy.wallets().actions.get(transectionId, {
      wallet_id: walletId,
    });
    if (data.status !== "pending" || Date.now() >= deadline) return data.status;
    await sleep(1000);
  }
}
export async function sendSOl(walletId: string, solAmount: string, depositAddress: string){
      const response = await privy.wallets().transfer(walletId, {
      source: {
        chain: "solana",
        asset: "sol",
        amount: solAmount,
      },
      destination: {
        address: depositAddress,
      },
      authorization_context: {
        authorization_private_keys: [env.PRIVY_AUTH_KEY!],
      },
    });
    return response;
}
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface createWallet {
  walletId: string;
  address: string;
}

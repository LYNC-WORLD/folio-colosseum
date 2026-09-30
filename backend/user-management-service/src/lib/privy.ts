import { PrivyClient, AuthorizationContext } from "@privy-io/node";
import { env } from "../config/env";
import { log } from "node:console";

export const privy = new PrivyClient({
  appId: env.PRIVY_APP_ID!,
  appSecret: env.PRIVY_APP_SECRET!,
});

export async function createUser(
  googleSubjectId: string,
  mail: string,
  name: string,
): Promise<createUserResponce> {
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
export async function createSolanaWallet(): Promise<createWallet> {
  try {
    const solanaWallet = await privy.wallets().create({
      chain_type: "solana",
      owner_id: env.PRIVY_AUTH_ADDRESS!,
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
export async function createEVMWallet(): Promise<createWallet> {
  try {
    const solanaWallet = await privy.wallets().create({
      chain_type: "ethereum",
      owner_id: env.PRIVY_AUTH_ADDRESS!,
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
export async function getTransectionResults(
  walletId: string,
  transectionId: string,
) {
  while (true) {
    const data = await privy.wallets().actions.get(transectionId, {
      wallet_id: walletId,
    });
    if (data.status == "pending") {
      await sleep(1000);
    } else return data.status;
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface createUserResponce {
  userId: string;
}
interface createWallet {
  walletId: string;
  address: string;
}

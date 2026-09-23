import { PrivyClient, AuthorizationContext } from "@privy-io/node";
import { env } from "../config/env";
import { log } from "node:console";

export const privy = new PrivyClient({
  appId: env.PRIVY_APP_ID!,
  appSecret: env.PRIVY_APP_SECRET!,
});

interface createUserResponce {
  userId: string;
  walletId: string;
  address: string;
}

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
    const wallet = await privy.wallets().create({
      chain_type: "solana",
      owner_id: env.PRIVY_AUTH_ADDRESS!,
      // owner: { public_key: env.PRIVY_AUTH_ADDRESS! },
    });
    return { userId: user.id, walletId: wallet.id, address: wallet.address };
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
    const data = await privy
      .wallets()
      .actions.get(transectionId, {
        wallet_id: walletId,
      });
      if(data.status == "failed"){
        await sleep(1000);
      }
      else return data.status;
  }
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
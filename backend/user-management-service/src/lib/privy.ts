import { PrivyClient } from "@privy-io/node";
import { env } from "../config/env";

const privy = new PrivyClient({
  appId: env.PRIVY_APP_ID!,
  appSecret: env.PRIVY_APP_SECRET!,
});

interface createUserResponce {
  userId: string;
  walletId: string;
  address: string;
}

export async function createUser(googleSubjectId: string, mail: string, name: string): Promise<createUserResponce> {
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
      owner: { user_id: user.id },
    });
    return {userId: user.id, walletId: wallet.id, address: wallet.address};
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getWallet(mail: string){
  const user = await privy.users().getByEmailAddress({address: "vaibhav03joshi@gmail.com"});
  // privy.wallets().swa
  // const wallet = await privy.wallets().get()
}
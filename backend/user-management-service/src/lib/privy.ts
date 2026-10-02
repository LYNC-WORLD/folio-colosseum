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
export async function buyStockOnChain(
  stockAddress: string,
  usdcAmount: number,
  walletId: string,
) {
  const responce = await privy
    .wallets()
    .swaps()
    .execute(walletId, {
      destination: {
        asset_address: stockAddress,
      },
      source: {
        asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
      base_amount: String(usdcAmount * 1000000).split(".")[0],
      amount_type: "exact_input",
      authorization_context: {
        authorization_private_keys: [env.PRIVY_AUTH_KEY!],
      },
    });
  return responce;
}
export async function sellStockOnChain(
  stockAddress: string,
  stockAmount: number,
  walletId: string,
  tokenDecimal: number,
) {
  console.log("Sell request: ", {
    destination: {
      asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
    source: {
      asset_address: stockAddress,
      caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    },
    base_amount: String(stockAmount * 10 ** tokenDecimal).split(".")[0],
    amount_type: "exact_input",
    authorization_context: {
      authorization_private_keys: [env.PRIVY_AUTH_KEY!],
    },
  });

  const responce = await privy
    .wallets()
    .swaps()
    .execute(walletId, {
      destination: {
        asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      },
      source: {
        asset_address: stockAddress,
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
      base_amount: String(stockAmount * 10 ** tokenDecimal).split(".")[0],
      amount_type: "exact_input",
      authorization_context: {
        authorization_private_keys: [env.PRIVY_AUTH_KEY!],
      },
    });
  return responce;
}
export async function getBuyQuote(
  stockAddress: string,
  usdcAmount: number,
  walletId: string,
) {
  const responce = await privy
    .wallets()
    .swaps()
    .quote(walletId, {
      destination: {
        asset_address: stockAddress,
      },
      source: {
        asset_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
      base_amount: String(usdcAmount * 1000000).split(".")[0],
      amount_type: "exact_input",
    });
  return responce;
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

interface createUserResponce {
  userId: string;
}
interface createWallet {
  walletId: string;
  address: string;
}

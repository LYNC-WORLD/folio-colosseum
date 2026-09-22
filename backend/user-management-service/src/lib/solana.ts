import { PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { env } from "../config/env";

export const solana = new Connection(
  env.RPC_URL!,
  "confirmed"
);

export async function getWalletTokens(walletAddress: string) {
  try {
  const owner = new PublicKey(walletAddress);

  const lamports = await solana.getBalance(owner);

  const solBalance = lamports / LAMPORTS_PER_SOL;

  const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );

  const TOKEN_2022_PROGRAM_ID = new PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  );

  const [classicTokens, token2022Tokens] = await Promise.all([
    solana.getParsedTokenAccountsByOwner(
      owner,
      { programId: TOKEN_PROGRAM_ID },
      "confirmed",
    ),

    solana.getParsedTokenAccountsByOwner(
      owner,
      { programId: TOKEN_2022_PROGRAM_ID },
      "confirmed",
    ),
  ]);

  const allAccounts = [...classicTokens.value, ...token2022Tokens.value];

  const tokens = allAccounts
    .map((account: any) => {
      const info = account.account.data.parsed.info;

      return {
        tokenAccount: account.pubkey.toBase58(),

        mint: info.mint,

        balance: Number(info.tokenAmount.uiAmountString),

        decimals: info.tokenAmount.decimals,

        rawBalance: info.tokenAmount.amount,
      };
    })
    // Don't show empty token accounts
    .filter((token) => token.balance > 0);

  return {
    walletAddress,

    sol: {
      balance: solBalance,
      lamports,
    },

    tokens,
  };
    
  } catch (error) {
    console.error(error);
    return;
  }
}

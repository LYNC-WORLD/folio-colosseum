import { verifyGoogleIdToken } from "../lib/google";
import { createEVMWallet, createSolanaWallet, createUser } from "../lib/privy";
import { prisma } from "../lib/prisma";

export class AuthService {
  public async getOrCreateUser(googleAccessToken: string) {
    if (!googleAccessToken) {
      return;
    }
    const { subjectId, username, email } =
      await verifyGoogleIdToken(googleAccessToken);

    const user = await prisma.user.findUnique({
      where: {
        email: email,
        wallets: { some: { chain: "SOLANA" } },
      },
      include: {
        wallets: true,
      },
    });
    console.log(user);

    if (!user) {
      // Creating user
      const privyUser = await createUser(subjectId, email, username);
      const solanaWallet = await createSolanaWallet();
      const evmWallet = await createEVMWallet();
      // saving to db
      const newUser = await prisma.user.create({
        data: {
          email: email,
          userId: privyUser.userId,
          name: username,
          googleSubjectId: subjectId,
        },
      });
      const solanaWalletDB = await prisma.wallet.create({
        data: {
          walletAddress: solanaWallet.address,
          walletId: solanaWallet.walletId,
          chain: "SOLANA",
          userId: newUser.id,
        },
      });
      const evmWalletDB = await prisma.wallet.create({
        data: {
          walletAddress: evmWallet.address,
          walletId: evmWallet.walletId,
          chain: "ETH",
          userId: newUser.id,
        },
      });
      return {
        address: solanaWalletDB.walletAddress,
        email: newUser.email,
        name: newUser.name,
        formFilled: false,
      };
    }
    return {
      address: user.wallets[0].walletAddress,
      email: user.email,
      name: user.name,
      formFilled: true,
    };
  }
}

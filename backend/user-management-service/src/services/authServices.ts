import { Chain } from "../generated/enums";
import { User, Wallet } from "../generated/client";
import { verifyGoogleIdToken } from "../lib/google";
import {
  createEVMWallet,
  createSolanaWallet,
  createUser,
  deleteUser,
} from "../lib/privy";
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
      },
      include: {
        wallets: true,
      },
    });

    if (!user) {
      const newUser = await this.createUserWithWallets(
        subjectId,
        email,
        username,
      );
      return toLoginResponse(newUser, false);
    }

    const loginForm = await prisma.loginDetails.findUnique({
      where: { email: email },
    });
    return toLoginResponse(user, !!loginForm);
  }

  private async createUserWithWallets(
    subjectId: string,
    email: string,
    username: string,
  ) {
    // Creating user
    const privyUser = await createUser(subjectId, email, username);
    try {
      const [solanaWallet, evmWallet] = await Promise.all([
        createSolanaWallet(walletIdempotencyKey(subjectId, Chain.SOLANA)),
        createEVMWallet(walletIdempotencyKey(subjectId, Chain.ETH)),
      ]);
      // saving to db
      return await prisma.user.create({
        data: {
          email: email,
          userId: privyUser.userId,
          name: username,
          googleSubjectId: subjectId,
          wallets: {
            create: [
              {
                chain: Chain.SOLANA,
                walletId: solanaWallet.walletId,
                walletAddress: solanaWallet.address,
              },
              {
                chain: Chain.ETH,
                walletId: evmWallet.walletId,
                walletAddress: evmWallet.address,
              },
            ],
          },
        },
        include: {
          wallets: true,
        },
      });
    } catch (error) {
      await deleteUser(privyUser.userId).catch(() => {});
      throw error;
    }
  }

}

function walletIdempotencyKey(subjectId: string, chain: Chain) {
  return `folio-wallet-${chain.toLowerCase()}-${subjectId}`;
}

function toLoginResponse(
  user: User & { wallets: Wallet[] },
  formFilled: boolean,
) {
  const solanaWallet = user.wallets.find(
    (wallet) => wallet.chain === Chain.SOLANA,
  );
  const ethereumWallet = user.wallets.find(
    (wallet) => wallet.chain === Chain.ETH,
  );
  return {
    address: solanaWallet?.walletAddress,
    solanaAddress: solanaWallet?.walletAddress,
    ethereumAddress: ethereumWallet?.walletAddress,
    email: user.email,
    name: user.name,
    formFilled: formFilled,
  };
}

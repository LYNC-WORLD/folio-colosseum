import { verifyAccessToken } from "../lib/google";
import { createUser } from "../lib/privy";
import { prisma } from "../server";

export class AuthService {
  public async getOrCreateUser(googleAccessToken: string) {
    if (!googleAccessToken) {
      return;
    }
    const {subjectId, username, email} = await verifyAccessToken(googleAccessToken)

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      // Creating user
      const privyUser = await createUser(subjectId, email, username);
      // saving to db
      const newUser = await prisma.user.create({
        data: {
          email: email,
          userId: privyUser.userId,
          walletId: privyUser.walletId,
          walletAddress: privyUser.address,
          name: username,
          googleSubjectId: subjectId
        },
      });
      return {
        address: newUser.walletAddress,
        email: newUser.email,
        name: newUser.name,
      };
    }
    return {
      address: user.walletAddress,
      email: user.email,
      name: user.name,
    };
  }
}

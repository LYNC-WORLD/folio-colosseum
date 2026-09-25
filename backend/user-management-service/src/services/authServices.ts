import { verifyGoogleIdToken } from "../lib/google";
import { createUser } from "../lib/privy";
import { prisma } from "../lib/prisma";

export class AuthService {
  public async getOrCreateUser(googleAccessToken: string) {
    if (!googleAccessToken) {
      return;
    }
    const {subjectId, username, email} = await verifyGoogleIdToken(googleAccessToken);

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    console.log(user);
    
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
        formFilled: false
      };
    }
    return {
      address: user.walletAddress,
      email: user.email,
      name: user.name,
      formFilled: true
    };
  }
}

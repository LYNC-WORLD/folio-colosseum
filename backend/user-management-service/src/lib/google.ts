import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

interface VerifyGoogleUserResponce {
  subjectId: string;
  username: string;
  email: string;
}
export async function verifyGoogleIdToken(
  googleIdToken: string,
): Promise<VerifyGoogleUserResponce> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleIdToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID || env.GOOGLE_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email_verified) {
      throw new Error("Google token has no subject or unverified email");
    }
    return {
      subjectId: payload.sub,
      username: payload.name ?? "",
      email: payload.email ?? "",
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

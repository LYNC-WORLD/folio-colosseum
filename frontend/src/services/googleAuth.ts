import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import type { GoogleSession } from "../types";
import { ENV } from "../config";

GoogleSignin.configure({
  webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
  iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
});

type SuccessData = { idToken: string | null; user: GoogleSession["user"] };

function toSession(data: SuccessData): GoogleSession {
  if (!data.idToken) {
    throw new Error("Google did not return an idToken. Check webClientId.");
  }
  return { user: data.user, idToken: data.idToken };
}

// Returns null if the user cancelled
export async function signInWithGoogle(): Promise<GoogleSession | null> {
  try {
    await GoogleSignin.hasPlayServices();
    const res = await GoogleSignin.signIn();
    return isSuccessResponse(res) ? toSession(res.data) : null;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    throw e;
  }
}

// Returns null if there is no previous session
export async function restoreGoogleSession(): Promise<GoogleSession | null> {
  const res = await GoogleSignin.signInSilently();
  return res.type === "success" ? toSession(res.data) : null;
}

export const signOutGoogle = () => GoogleSignin.signOut();

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OnboardingProfile } from "../context";

const PROFILE_KEY = "folio_profile_v1";

export async function saveOnboardingProfile(profile: OnboardingProfile) {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

export async function getOnboardingProfile(): Promise<OnboardingProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
}

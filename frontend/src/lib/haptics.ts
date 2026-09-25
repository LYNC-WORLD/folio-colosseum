// src/lib/haptics.ts — tiny wrappers so a missing haptics engine never throws.
import * as Haptics from "expo-haptics";

export const hTap = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const hSelect = () => Haptics.selectionAsync().catch(() => {});
export const hSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
export const hError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {},
  );

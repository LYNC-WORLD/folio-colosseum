// "Notify me when" switches — saved on the phone until there is a push backend.
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFY_OPTIONS = [
  { key: "followBuys", label: "Someone I follow buys" },
  { key: "groupProposal", label: "A group opens a proposal" },
  { key: "recurringRuns", label: "A recurring buy runs" },
  { key: "dailyBriefing", label: "Daily analyst briefing" },
] as const;

export type NotifyKey = (typeof NOTIFY_OPTIONS)[number]["key"];
type Prefs = Record<NotifyKey, boolean>;

const KEY = "folio_notify_prefs_v1";
let prefs: Prefs = {
  followBuys: true,
  groupProposal: true,
  recurringRuns: true,
  dailyBriefing: false,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) {
      prefs = { ...prefs, ...(JSON.parse(raw) as Partial<Prefs>) };
      emit();
    }
  })
  .catch(() => {});

export function setNotify(key: NotifyKey, on: boolean) {
  prefs = { ...prefs, [key]: on };
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
  emit();
}

export function useNotifyPrefs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => prefs,
  );
}

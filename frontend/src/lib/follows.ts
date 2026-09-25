// Who you follow — kept on the device until the backend has a follow endpoint.
// Tiny shared store so Leaders and the Investor screen always agree.
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "folio_following_v1";
let following = new Set<string>();
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) {
      following = new Set(JSON.parse(raw) as string[]);
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function toggleFollow(id: string) {
  const next = new Set(following);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  following = next;
  AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
  listeners.forEach((l) => l());
  return next.has(id);
}

export function useFollowing() {
  return useSyncExternalStore(subscribe, () => following);
}

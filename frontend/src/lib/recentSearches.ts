// Last five searches, kept on the device.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "folio_recent_searches_v1";

export async function loadRecents(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecents(list: string[]) {
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
}

/** move `q` to the front, no duplicates (case-insensitive), max 5 */
export function withRecent(list: string[], q: string) {
  const t = q.trim();
  if (!t) return list;
  return [t, ...list.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 5);
}

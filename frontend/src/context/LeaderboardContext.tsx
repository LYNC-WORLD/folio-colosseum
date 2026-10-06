import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "./index"; // adjust to wherever useAuth lives
import {
  getMyPerpLeaderboard,
  getPerpLeaderboard,
  MyPerpLeaderboard,
  PerpLeaderboardEntry,
} from "../services/leaderboard";

const CACHE_KEY = "folio.perpLeaderboard.v1";
const STALE_MS = 60_000; // don't refetch on foreground more than once a minute

type Value = {
  entries: PerpLeaderboardEntry[];
  me: MyPerpLeaderboard | null;
  totalRanked: number;
  loading: boolean; // true only when there is nothing to show yet
  refreshing: boolean; // background refetch in progress
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { idToken } = useAuth();
  const [entries, setEntries] = useState<PerpLeaderboardEntry[]>([]);
  const [me, setMe] = useState<MyPerpLeaderboard | null>(null);
  const [totalRanked, setTotalRanked] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef(0);
  const inFlight = useRef(false);

  // 1. paint from cache immediately
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const c = JSON.parse(raw);
        setEntries(c.entries ?? []);
        setMe(c.me ?? null);
        setTotalRanked(c.totalRanked ?? 0);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // 2. fetch fresh data
  const refresh = useCallback(async () => {
    if (!idToken || inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setError(null);
    try {
      const [board, mine] = await Promise.all([
        getPerpLeaderboard(idToken, { limit: 50, offset: 0 }),
        getMyPerpLeaderboard(idToken),
      ]);
      setEntries(board.data.entries);
      setTotalRanked(board.data.totalRanked);
      setMe(mine.data);
      lastFetch.current = Date.now();
      AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          entries: board.data.entries,
          totalRanked: board.data.totalRanked,
          me: mine.data,
        }),
      ).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leaderboard");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [idToken]);

  // 3. fetch as soon as we have a token (i.e. app open / login)
  useEffect(() => {
    if (idToken) refresh();
  }, [idToken, refresh]);

  // 4. refetch when app returns to foreground (throttled)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && Date.now() - lastFetch.current > STALE_MS)
        refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo<Value>(
    () => ({
      entries,
      me,
      totalRanked,
      loading: entries.length === 0 && (!hydrated || (refreshing && !error)),
      refreshing,
      error,
      refresh,
    }),
    [entries, me, totalRanked, hydrated, refreshing, error, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeaderboard() {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useLeaderboard must be used inside LeaderboardProvider");
  return v;
}

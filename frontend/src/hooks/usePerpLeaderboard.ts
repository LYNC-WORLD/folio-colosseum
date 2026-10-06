import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context";
import {
  getMyPerpLeaderboard,
  getPerpLeaderboard,
  MyPerpLeaderboard,
  PerpLeaderboardEntry,
} from "../services/leaderboard";

export function usePerpLeaderboard(limit = 50) {
  const { idToken } = useAuth();
  const [entries, setEntries] = useState<PerpLeaderboardEntry[]>([]);
  const [me, setMe] = useState<MyPerpLeaderboard | null>(null);
  const [totalRanked, setTotalRanked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const [board, mine] = await Promise.all([
        getPerpLeaderboard(idToken, { limit, offset: 0 }),
        getMyPerpLeaderboard(idToken),
      ]);
      if (!alive.current) return;
      setEntries(board.data.entries);
      setTotalRanked(board.data.totalRanked);
      setMe(mine.data);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not load leaderboard");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [idToken, limit]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  return { entries, me, totalRanked, loading, error, refresh: load };
}

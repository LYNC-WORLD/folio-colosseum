export type PerpLeaderboardEntry = {
  rank: number;
  displayName: string;
  returnPercent: number | null;
  accountValue: string;
  netDepositsUsdc: string;
  refreshedAt: string;
};

export type PerpLeaderboardResponse = {
  success: boolean;
  message: string;
  data: {
    entries: PerpLeaderboardEntry[];
    totalRanked: number;
    refreshedAt: string;
  };
};

export type MyPerpLeaderboard = {
  rank: number | null;
  returnPercent: number | null;
  accountValue: string;
  netDepositsUsdc: string;
  totalRanked: number;
  refreshedAt: string;
  neighbors: PerpLeaderboardEntry[];
};

export type MyPerpLeaderboardResponse = {
  success: boolean;
  message: string;
  data: MyPerpLeaderboard;
};
import { request } from "./api/client";

export const getPerpLeaderboard = (
  idToken: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
) =>
  request<PerpLeaderboardResponse>(
    `/api/leaderboard/perp?limit=${limit}&offset=${offset}`,
    { token: idToken },
  );

export const getMyPerpLeaderboard = (idToken: string) =>
  request<MyPerpLeaderboardResponse>("/api/leaderboard/perp/me", {
    token: idToken,
  });

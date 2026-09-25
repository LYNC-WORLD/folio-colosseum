// ⚠️ SAMPLE DATA — the backend has no leaderboard yet.
// Taken from the prototype so the Leaderboard and Investor screens can be
// built and reviewed. Replace `useLeaders()` below with a real query when
// an endpoint exists; the screens only depend on the Investor type.

export const LEADERS_ARE_SAMPLE = true;

export type Investor = {
  id: string;
  name: string;
  city: string;
  /** median return this quarter, % */
  ret: number;
  trades: number;
  followers: string;
  color: string;
  /** [asset, return %] */
  holds: [string, number][];
  /** in the "Friends" filter (people you know) */
  friend?: boolean;
};

export const INVESTORS: Investor[] = [
  {
    id: "emma",
    name: "Emma",
    city: "LONDON",
    ret: 42,
    trades: 38,
    followers: "12.4K",
    color: "#E8A33D",
    holds: [
      ["NVDA", 31],
      ["SpaceX", 62],
      ["XAUT", -2],
    ],
  },
  {
    id: "oliver",
    name: "Oliver",
    city: "DUBAI",
    ret: 37,
    trades: 22,
    followers: "8.1K",
    color: "#6FA8F5",
    holds: [
      ["MSFT", 19],
      ["Helix AI", 44],
    ],
  },
  {
    id: "hannah",
    name: "Hannah",
    city: "SINGAPORE",
    ret: 33,
    trades: 51,
    followers: "6.7K",
    color: "#F07F9B",
    holds: [
      ["TSLA", 12],
      ["SpaceX", 55],
    ],
  },
  {
    id: "lucas",
    name: "Lucas",
    city: "TORONTO",
    ret: 29,
    trades: 17,
    followers: "4.2K",
    color: "#C79BF0",
    holds: [["AAPL", 9]],
    friend: true,
  },
  {
    id: "marco",
    name: "Marco",
    city: "BERLIN",
    ret: 28,
    trades: 30,
    followers: "3.9K",
    color: "#7FD8A8",
    holds: [["NVDA", 22]],
    friend: true,
  },
  {
    id: "priya",
    name: "Priya",
    city: "MUMBAI",
    ret: 24,
    trades: 44,
    followers: "3.1K",
    color: "#7FD3E0",
    holds: [["XAUT", 14]],
    friend: true,
  },
  {
    id: "yusuf",
    name: "Yusuf",
    city: "CAIRO",
    ret: 21,
    trades: 12,
    followers: "2.4K",
    color: "#B9C06F",
    holds: [["TBILL", 2]],
    friend: true,
  },
];

/** What an investor added to their watchlist most recently (prototype #iWatch). */
export const WATCHING: [
  code: string,
  name: string,
  when: string,
  kind: string,
][] = [
  ["HLX", "Helix AI", "ADDED 2H AGO", "PRE-IPO"],
  ["KTP", "Kite Pay", "ADDED TODAY", "PRE-IPO"],
  ["AMD", "AMD", "ADDED YESTERDAY", "STOCK"],
];

const PRE_IPO_NAMES = ["SpaceX", "Helix AI", "Kite Pay"];

export type LeaderFilter = "Global" | "Friends" | "Pre-IPO";

export function useLeaders(filter: LeaderFilter) {
  const list =
    filter === "Friends"
      ? INVESTORS.filter((i) => i.friend)
      : filter === "Pre-IPO"
        ? INVESTORS.filter((i) =>
            i.holds.some(([a]) => PRE_IPO_NAMES.includes(a)),
          )
        : INVESTORS;
  return { investors: list, loading: false, error: null as string | null };
}

export const findInvestor = (id: string) => INVESTORS.find((i) => i.id === id);
export const globalRank = (id: string) =>
  INVESTORS.findIndex((i) => i.id === id) + 1;

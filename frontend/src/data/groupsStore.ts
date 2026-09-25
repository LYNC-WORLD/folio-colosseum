// ⚠️ SAMPLE GROUPS — there is no groups backend yet.
//
// Everything lives on the phone (AsyncStorage) so the Groups screens are
// fully usable: join, leave, create, propose, go in on a proposal, chat.
// Nothing here moves money. When a backend exists, replace the functions
// at the bottom (join, create, propose, …) with API calls and keep the
// `Group` shape, and the screens won't need to change.

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GROUPS_ARE_SAMPLE = true;

export type Member = { name: string; color: string };
export type Message = { id: string; from: string; text: string; at: number };
export type Proposal = {
  by: string;
  byColor: string;
  asset: string;
  kind: "PRE-IPO" | "STOCK";
  /** $ each member puts in */
  share: number;
  inCount: number;
  closes: string;
  youIn: boolean;
};
export type Group = {
  id: string;
  name: string;
  members: Member[];
  /** total members (can be more than the avatars we know about) */
  memberCount: number;
  joined: boolean;
  /** anyone can find and join it */
  isPublic: boolean;
  /** minimum share to join */
  min: number;
  /** group return, % — shown on your groups */
  ret?: number;
  last?: string;
  proposal?: Proposal;
  chat: Message[];
};

const M = {
  A: { name: "Arjun", color: "#E8A33D" },
  M: { name: "Marco", color: "#6FA8F5" },
  C: { name: "Chloe", color: "#F07F9B" },
  H: { name: "Hannah", color: "#7FD8A8" },
  O: { name: "Oliver", color: "#C79BF0" },
  L: { name: "Lena", color: "#F0A07F" },
  R: { name: "Rohan", color: "#7FD3E0" },
  N: { name: "Neha", color: "#B9C06F" },
  D: { name: "Dev", color: "#6FA8F5" },
  S: { name: "Sara", color: "#F07F9B" },
};

let n = 0;
const msg = (from: string, text: string, minsAgo: number): Message => ({
  id: `seed${n++}`,
  from,
  text,
  at: Date.now() - minsAgo * 60_000,
});

const SEED: Group[] = [
  {
    id: "weekend",
    name: "Weekend Investors",
    members: [M.A, M.M, M.C, M.H, M.O, M.L],
    memberCount: 8,
    joined: true,
    isPublic: false,
    min: 25,
    proposal: {
      by: "Chloe",
      byColor: M.C.color,
      asset: "Nova Rockets",
      kind: "PRE-IPO",
      share: 50,
      inCount: 5,
      closes: "4PM",
      youIn: false,
    },
    chat: [
      msg("Marco", "in.", 42),
      msg("Hannah", "finally a pre-IPO we can all get into", 38),
      msg("Oliver", "count me in — what's the lock like?", 31),
      msg("Chloe", "until they list. no secondary before that", 29),
    ],
  },
  {
    id: "bhilwara",
    name: "Bhilwara Bulls",
    members: [M.R, M.N, M.A, M.D],
    memberCount: 5,
    joined: true,
    isPublic: false,
    min: 10,
    ret: 18,
    last: "Last buy: gold, 2 weeks ago",
    chat: [
      msg("Rohan", "gold again next month?", 300),
      msg("Neha", "only if it dips under 2,600", 290),
    ],
  },
  {
    id: "aionly",
    name: "AI Only",
    members: [M.D, M.S, M.M, M.O, M.H],
    memberCount: 12,
    joined: true,
    isPublic: true,
    min: 25,
    ret: 41,
    last: "Last buy: Helix AI, 3 days ago",
    chat: [
      msg("Dev", "Helix filled at $28B, nice", 900),
      msg("Sara", "watching Kite Pay for the next round", 880),
    ],
  },
  {
    id: "preipohunters",
    name: "Pre-IPO Hunters",
    members: [M.L, M.C, M.S],
    memberCount: 34,
    joined: false,
    isPublic: true,
    min: 50,
    chat: [],
  },
  {
    id: "dividend",
    name: "Dividend Club",
    members: [M.N, M.O],
    memberCount: 19,
    joined: false,
    isPublic: true,
    min: 25,
    chat: [],
  },
];

// ---------- tiny persisted store ----------
const KEY = "folio_groups_v1";
let groups: Group[] = SEED;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () =>
  AsyncStorage.setItem(KEY, JSON.stringify(groups)).catch(() => {});

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) {
      groups = JSON.parse(raw) as Group[];
      emit();
    }
  })
  .catch(() => {});

function set(next: Group[]) {
  groups = next;
  save();
  emit();
}
const patch = (id: string, fn: (g: Group) => Group) =>
  set(groups.map((g) => (g.id === id ? fn(g) : g)));

export function useGroups() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => groups,
  );
}
export const useGroup = (id: string) => useGroups().find((g) => g.id === id);

const YOU: Member = { name: "You", color: "#37E099" };
const note = (from: string, text: string): Message => ({
  id: `m${Date.now()}${Math.random()}`,
  from,
  text,
  at: Date.now(),
});

// ---------- actions (swap these for API calls later) ----------

export function joinGroup(id: string) {
  patch(id, (g) => ({
    ...g,
    joined: true,
    memberCount: g.memberCount + 1,
    members: [...g.members, YOU],
  }));
}

export function leaveGroup(id: string) {
  patch(id, (g) => ({
    ...g,
    joined: false,
    memberCount: Math.max(0, g.memberCount - 1),
    members: g.members.filter((m) => m.name !== "You"),
    proposal: g.proposal?.youIn
      ? { ...g.proposal, youIn: false, inCount: g.proposal.inCount - 1 }
      : g.proposal,
  }));
}

export function createGroup(name: string, min: number, isPublic: boolean) {
  const id = `g${Date.now()}`;
  set([
    {
      id,
      name,
      members: [YOU],
      memberCount: 1,
      joined: true,
      isPublic,
      min,
      chat: [note("You", "started the group")],
    },
    ...groups,
  ]);
  return id;
}

export function goIn(id: string) {
  patch(id, (g) =>
    g.proposal && !g.proposal.youIn
      ? {
          ...g,
          proposal: {
            ...g.proposal,
            youIn: true,
            inCount: g.proposal.inCount + 1,
          },
          chat: [...g.chat, note("You", `in for $${g.proposal.share}`)],
        }
      : g,
  );
}

export function propose(
  id: string,
  asset: string,
  kind: Proposal["kind"],
  share: number,
) {
  patch(id, (g) => ({
    ...g,
    proposal: {
      by: "You",
      byColor: YOU.color,
      asset,
      kind,
      share,
      inCount: 1,
      closes: "IN 24H",
      youIn: true,
    },
    chat: [...g.chat, note("You", `proposed ${asset} · $${share} each`)],
  }));
}

export function sendMessage(id: string, text: string) {
  patch(id, (g) => ({ ...g, chat: [...g.chat, note("You", text)] }));
}

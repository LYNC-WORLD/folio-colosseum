// src/theme/colors.ts
//
// Folio — dark ground, one action colour (mint), loss in red.
// Tokens mirror the prototype's CSS variables 1:1.
//
// Legacy keys (bg, card, ink, muted, ring, accent, buttonBg, buttonInk,
// error, success, raised, hairline, bone, inkSecondary, inkMuted, jade,
// clay, amber, series) are kept and repointed, so every existing screen
// re-themes automatically.

// ---- prototype tokens ----
const ground = "#0A0B0E";
const surface = "#14171E";
const raised = "#1A1F28";
const sunk = "#101822";
const hair = "#1C2129";
const stroke = "#262C36";

const ink1 = "#FFFFFF";
const ink2 = "#A8AEB6";
const ink3 = "#8A9099";
const ink4 = "#7C838C";

const mint = "#37E099";
const mintHi = "#4FF6BB";
const mintLo = "#01D794";
const mintDeep = "#0C9A6C";
const onMint = "#06120D";

const loss = "#F0604D";
const amber = "#E8A33D";

export const C = {
  // surfaces
  ground,
  surface,
  raised,
  sunk,
  hair,
  stroke,
  strokeHi: "#2F3642",
  track: "#242A34", // progress / bar backgrounds
  dotRing: "#3A404A", // unselected radio ring
  grab: "#333B46", // sheet grab handle

  // ink
  ink1,
  ink2,
  ink3,
  ink4,

  // action
  mint,
  mintHi,
  mintLo,
  mintDeep,
  onMint,
  mintWash: "rgba(55,224,153,0.12)",
  mintEdge: "rgba(55,224,153,0.42)",
  mintGlow: "rgba(55,224,153,0.18)",

  // semantic
  loss,
  amber,

  // overlays
  scrim: "rgba(4,5,7,0.68)",
  tabBg: "rgba(10,11,14,0.92)",

  // avatar fills (people in Leaders / Groups)
  avatar: [
    "#37E099",
    "#6FA8F5",
    "#F07F9B",
    "#C79BF0",
    "#7FD3E0",
    "#E8A33D",
    "#7FD8A8",
    "#F0A07F",
  ],

  // ---- legacy keys, repointed ----
  bg: ground,
  card: surface,
  ink: ink1,
  muted: ink2,
  ring: hair,
  accent: mint,
  buttonBg: mint,
  buttonInk: onMint,
  error: loss,
  success: mint,
  hairline: hair,
  bone: ink1,
  inkSecondary: ink2,
  inkMuted: ink4,
  jade: mint,
  clay: loss,
  series: {
    usStocks: "#6FA8F5",
    preIpo: "#F0A07F",
    commodities: "#E8A33D",
    crypto: "#C79BF0",
  },
} as const;

export const RADIUS = {
  sm: 9,
  md: 12,
  lg: 14,
  card: 16,
  wash: 18,
  sheet: 26,
  pill: 999,
};

export type Colors = typeof C;

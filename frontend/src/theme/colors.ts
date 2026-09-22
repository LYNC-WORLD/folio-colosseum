// src/theme/colors.ts
//
// "Ink, bone and the market's own colour."
// Folio has no brand colour. The ground is warm graphite, the action colour
// is bone, and every hue on screen belongs to data — direction or asset
// class. Nothing decorative is ever coloured, so colour always means
// something.
//
// NOTE: the original key names (bg, card, ink, muted, ring, accent,
// buttonBg, buttonInk, error, success) are kept so every screen that
// already imports `C` re-themes automatically — nothing else needs to
// change just to pick up the new look. New tokens are added alongside.

export const C = {
  // ---- ground & ink (backward-compatible keys) ----
  bg: "#0D0B0A", // ground
  card: "#161311", // surface
  ink: "#F5F0E8", // bone — text & action
  muted: "#A39A90", // ink secondary
  ring: "#2C2724", // hairline
  accent: "#F5F0E8", // no brand colour — accents are bone, not a hue
  buttonBg: "#FFFFFF",
  buttonInk: "#0D0B0A",
  error: "#E8705A", // clay — losses only
  success: "#4FC98F", // jade — gains, live, confirmed

  // ---- extended ink scale ----
  raised: "#201C19", // raised / selected surface
  hairline: "#2C2724",
  bone: "#F5F0E8",
  inkSecondary: "#A39A90",
  inkMuted: "#8A8078",

  // ---- semantic (the only colour allowed to mean something) ----
  jade: "#4FC98F", // up
  clay: "#E8705A", // down
  amber: "#D9954E", // caution / premium / crowded / cooling

  // ---- asset-class series colours (charts, tags, dots — never UI chrome) ----
  series: {
    usStocks: "#3987e5",
    preIpo: "#d95926",
    commodities: "#199e70",
    crypto: "#c98500",
  },
} as const;

export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 14,
  pill: 999,
};

export type Colors = typeof C;

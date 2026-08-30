// The known rack locations pallets can be racked at, plus the shared
// no-rack floor area (see CLAUDE.md's "CA commodity" background). Currently
// a placeholder list matching backend/scripts/seed.sh's demo data - expand
// as the real warehouse's rack layout is confirmed.
export const CA_COMMODITY_FLOOR = "CA Commodity Floor";

export const RACK_LOCATIONS = [
  "CA01-RCK01",
  "CA01-RCK02",
  "CA02-RCK03",
  "CA03-RCK01",
] as const;

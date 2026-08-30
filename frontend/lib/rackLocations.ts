// The known rack locations pallets can be racked at, plus the shared
// no-rack floor area (see CLAUDE.md's "CA commodity" background). Only one
// zone (CA01) currently exists - not CA02/CA03. Rack numbers are
// zero-padded to a 2-digit minimum (01, 02, ... 99), naturally becoming 3
// digits past 99 (100, 101, ...) rather than staying padded to a fixed
// width. RACK_COUNT is a placeholder pending the real warehouse's actual
// highest rack number.
export const CA_COMMODITY_FLOOR = "CA Commodity Floor";

const ZONE = "CA01";
const RACK_COUNT = 999;

export const RACK_LOCATIONS: string[] = Array.from(
  { length: RACK_COUNT },
  (_, i) => `${ZONE}-RCK${String(i + 1).padStart(2, "0")}`
);

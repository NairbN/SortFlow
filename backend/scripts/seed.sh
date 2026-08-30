#!/usr/bin/env bash
# Resets local dev data and seeds the SLA queue with a realistic demo set.
# Talks to the running API (not raw SQL) so position assignment and the
# staging cascade run exactly as they would for a real user.
#
# Usage: run from the repo root (needs docker-compose.yml in cwd):
#   backend/scripts/seed.sh
# Backend + db must already be up, e.g. `docker-compose up -d`.

set -euo pipefail

API="${API:-http://localhost:8000}"
API_KEY="${API_KEY:-dev-local-api-key}"
PY=$(command -v python3 >/dev/null 2>&1 && echo python3 || echo python)

echo "Clearing existing orders (including archived - via SQL, not the API, since"
echo "the API's DELETE only ever sees active orders)..."
docker-compose exec -T db psql -U sortflow -d sortflow \
  -c "TRUNCATE orders RESTART IDENTITY CASCADE;" >/dev/null

# Shared across every build_pallets_json call below, so pallet IDs and real
# rack locations are unique across the WHOLE seed run, not just within one
# order - every real rack is used by at most one pallet. "CA Commodity
# Floor" is the one location that's fine to repeat (it's the shared no-rack
# floor area, not an actual rack).
pallet_counter=0
rack_counter=0

# Builds one order's pallets JSON into $PALLETS_JSON. Args: pallet count,
# "floor every Nth pallet" (0 = none go to the floor, all get a real rack).
# Sets a global instead of echoing its result for command substitution to
# capture - command substitution runs in a subshell, which would silently
# discard this function's pallet_counter/rack_counter increments and reset
# both to their last value in the *parent* shell on every call, producing
# duplicate pallet IDs and rack locations from the second order onward.
build_pallets_json() {
  local count="$1" floor_every="$2"
  local i pallet_id rack
  PALLETS_JSON="["
  for ((i = 1; i <= count; i++)); do
    pallet_counter=$((pallet_counter + 1))
    pallet_id=$(printf "PLT-%07d" "$pallet_counter")
    if ((floor_every > 0 && i % floor_every == 0)); then
      rack="CA Commodity Floor"
    else
      rack_counter=$((rack_counter + 1))
      rack=$(printf "CA01-RCK%02d" "$rack_counter")
    fi
    ((i > 1)) && PALLETS_JSON+=","
    PALLETS_JSON+="{\"pallet_id\":\"$pallet_id\",\"rack_location\":\"$rack\"}"
  done
  PALLETS_JSON+="]"
}

create_order() {
  local client_name="$1" order_number="$2" sla_due_date="$3" pallets_json="$4"
  curl -s -X POST "$API/orders" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"client_name\":\"$client_name\",\"order_number\":\"$order_number\",\"sla_due_date\":\"$sla_due_date\",\"pallets\":$pallets_json}" \
    -o /dev/null -w "  %{http_code} %{url_effective}\n"
}

echo "Seeding orders (earliest due date first, so default position matches urgency)..."
echo "Pallet counts vary (1 to 12) and every real rack location is used at most once."

build_pallets_json 2 0
create_order "Meridian Health" "ORD-00001" "2026-08-20" "$PALLETS_JSON"

build_pallets_json 1 0
create_order "Vantage Financial" "ORD-00002" "2026-08-24" "$PALLETS_JSON"

build_pallets_json 5 3
create_order "Coastal Logistics" "ORD-00003" "2026-08-26" "$PALLETS_JSON"

build_pallets_json 12 2
create_order "Summit Retail Group" "ORD-00004" "2026-09-02" "$PALLETS_JSON"

build_pallets_json 3 2
create_order "Ashford Legal" "ORD-00005" "2026-09-10" "$PALLETS_JSON"

echo "Done. Current queue:"
curl -s -H "X-API-Key: $API_KEY" "$API/orders" | "$PY" -m json.tool

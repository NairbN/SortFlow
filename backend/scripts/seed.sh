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

create_order() {
  local client_name="$1" order_number="$2" sla_due_date="$3" pallets_json="$4"
  curl -s -X POST "$API/orders" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"client_name\":\"$client_name\",\"order_number\":\"$order_number\",\"sla_due_date\":\"$sla_due_date\",\"pallets\":$pallets_json}" \
    -o /dev/null -w "  %{http_code} %{url_effective}\n"
}

echo "Seeding orders (earliest due date first, so default position matches urgency)..."

create_order "Meridian Health" "ORD-00001" "2026-08-20" \
  '[{"pallet_id":"PLT-0000001","rack_location":"CA01-RCK01"},{"pallet_id":"PLT-0000002","rack_location":"CA01-RCK01"}]'

create_order "Vantage Financial" "ORD-00002" "2026-08-24" \
  '[{"pallet_id":"PLT-0000003","rack_location":"CA02-RCK03"}]'

create_order "Coastal Logistics" "ORD-00003" "2026-08-26" \
  '[{"pallet_id":"PLT-0000004","rack_location":"CA01-RCK02"},{"pallet_id":"PLT-0000005","rack_location":null}]'

create_order "Summit Retail Group" "ORD-00004" "2026-09-02" \
  '[{"pallet_id":"PLT-0000006","rack_location":"CA03-RCK01"}]'

create_order "Ashford Legal" "ORD-00005" "2026-09-10" \
  '[{"pallet_id":"PLT-0000007","rack_location":null},{"pallet_id":"PLT-0000008","rack_location":null},{"pallet_id":"PLT-0000009","rack_location":"CA01-RCK01"}]'

echo "Done. Current queue:"
curl -s -H "X-API-Key: $API_KEY" "$API/orders" | "$PY" -m json.tool

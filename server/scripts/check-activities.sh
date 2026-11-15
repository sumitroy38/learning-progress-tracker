#!/bin/bash
# Usage: bash scripts/check-activities.sh COORDINATOR_PASSWORD
COORD_PASSWORD="$1"
if [ -z "$COORD_PASSWORD" ]; then
  echo "Usage: bash scripts/check-activities.sh COORDINATOR_PASSWORD"
  exit 1
fi

URL="http://localhost:4000/api/v1"
JAR=$(mktemp)
EMAIL="coordinator@example.com"
FAILS=0

token() {
  curl -s -c "$JAR" -b "$JAR" "$URL/auth/csrf-token" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/'
}

# request METHOD PATH [JSON_BODY]  ->  fills STATUS and BODY
request() {
  local method="$1" path="$2" data="$3"
  [ -z "$data" ] && data='{}'
  local args=(-s -w $'\n%{http_code}' -c "$JAR" -b "$JAR" -X "$method" "$URL$path")
  if [ "$method" != "GET" ]; then
    args+=(-H "Content-Type: application/json" -d "$data" -H "x-csrf-token: $(token)")
  fi
  local out
  out=$(curl "${args[@]}")
  STATUS="${out##*$'\n'}"
  BODY="${out%$'\n'*}"
}

check() {
  if [ "$STATUS" = "$2" ]; then
    echo "PASS  $1 (got $STATUS)"
  else
    echo "FAIL  $1 (expected $2, got $STATUS)"
    FAILS=$((FAILS + 1))
  fi
}

request GET /activities
check "Signed out user cannot list activities" 401

request POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$COORD_PASSWORD\"}"
check "Coordinator signs in" 200

request GET /activities
check "Coordinator can list activities" 200

request POST /activities '{"title":"Check Script Activity","topic":"Testing","plannedHours":2.5}'
check "Create activity" 201
NEW_ID=$(echo "$BODY" | sed -E 's/.*"id":([0-9]+).*/\1/')

request POST /activities '{"topic":"Testing","plannedHours":2}'
check "Missing title is rejected" 400

request POST /activities '{"title":"X","topic":"Testing","plannedHours":0}'
check "Zero hours is rejected" 400

request POST /activities '{"title":"X","topic":"Testing","plannedHours":-3}'
check "Negative hours is rejected" 400

request POST /activities '{"title":"X","topic":"Testing","plannedHours":"abc"}'
check "Hours that are not a number are rejected" 400

request PUT "/activities/$NEW_ID" '{"title":"Check Script Activity Edited","topic":"Testing","plannedHours":3}'
check "Edit activity" 200

request PUT "/activities/$NEW_ID" '{"title":"","topic":"Testing","plannedHours":1}'
check "Edit with empty title is rejected" 400

request PUT /activities/999999 '{"title":"X","topic":"Testing","plannedHours":1}'
check "Editing a missing activity gives 404" 404

request POST /auth/logout
check "Coordinator signs out" 204

# Remove the test activity so your data stays clean
psql -d "${DB_NAME:-lpt}" -q -c "DELETE FROM activities WHERE title LIKE 'Check Script Activity%';"
rm -f "$JAR"

if [ "$FAILS" -eq 0 ]; then echo "All checks passed."; else echo "$FAILS check(s) failed."; fi
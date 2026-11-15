#!/bin/bash
# Usage: bash scripts/check-candidates.sh COORDINATOR_PASSWORD
COORD_PASSWORD="$1"
if [ -z "$COORD_PASSWORD" ]; then
  echo "Usage: bash scripts/check-candidates.sh COORDINATOR_PASSWORD"
  exit 1
fi

URL="http://localhost:4000/api/v1"
COORD_JAR=$(mktemp)
CAND_JAR=$(mktemp)
COORD_EMAIL="coordinator@example.com"
STAMP=$(date +%s)
TEST_EMAIL="check.$STAMP@example.com"
CAND_NEW_PASSWORD="CandidatePass2026"
FAILS=0

token() {
  curl -s -c "$1" -b "$1" "$URL/auth/csrf-token" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/'
}

# request JAR METHOD PATH [JSON_BODY]  ->  fills STATUS and BODY
request() {
  local jar="$1" method="$2" path="$3" data="$4"
  [ -z "$data" ] && data='{}'
  local args=(-s -w $'\n%{http_code}' -c "$jar" -b "$jar" -X "$method" "$URL$path")
  if [ "$method" != "GET" ]; then
    args+=(-H "Content-Type: application/json" -d "$data" -H "x-csrf-token: $(token "$jar")")
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

check_absent() {
  if echo "$BODY" | grep -qE 'password_hash|\$2b\$'; then
    echo "FAIL  $1 (a password hash was found)"
    FAILS=$((FAILS + 1))
  else
    echo "PASS  $1"
  fi
}

request "$COORD_JAR" GET /learners
check "Signed out user cannot list learners" 401

request "$COORD_JAR" POST /auth/login "{\"email\":\"$COORD_EMAIL\",\"password\":\"$COORD_PASSWORD\"}"
check "Coordinator signs in" 200

request "$COORD_JAR" GET /learners
check "Coordinator can list learners" 200

request "$COORD_JAR" POST /learners "{\"name\":\"Check Candidate\",\"email\":\"$TEST_EMAIL\",\"cohort\":\"Cohort Test\"}"
check "Create candidate" 201
check_absent "Create answer has no password hash"
LEARNER_ID=$(echo "$BODY" | sed -E 's/.*"learner":\{"id":([0-9]+).*/\1/')
TEMP1=$(echo "$BODY" | sed -E 's/.*"temporaryPassword":"([^"]+)".*/\1/')

request "$COORD_JAR" POST /learners "{\"email\":\"x.$STAMP@example.com\",\"cohort\":\"Cohort Test\"}"
check "Missing name is rejected" 400

request "$COORD_JAR" POST /learners '{"name":"No Email","cohort":"Cohort Test"}'
check "Missing email is rejected" 400

request "$COORD_JAR" POST /learners "{\"name\":\"No Cohort\",\"email\":\"y.$STAMP@example.com\"}"
check "Missing cohort is rejected" 400

request "$COORD_JAR" POST /learners '{"name":"Bad Email","email":"not-an-email","cohort":"Cohort Test"}'
check "Invalid email is rejected" 400

request "$COORD_JAR" POST /learners "{\"name\":\"Copy\",\"email\":\"$TEST_EMAIL\",\"cohort\":\"Cohort Test\"}"
check "Duplicate email is rejected" 409

request "$COORD_JAR" POST /learners "{\"name\":\"Copy\",\"email\":\"CHECK.$STAMP@EXAMPLE.COM\",\"cohort\":\"Cohort Test\"}"
check "Duplicate email in other letter case is rejected" 409

request "$CAND_JAR" POST /auth/login "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEMP1\"}"
check "Candidate signs in with temporary password" 200

request "$CAND_JAR" GET /learners
check "Candidate is locked until password change" 403

request "$CAND_JAR" POST /auth/change-password "{\"currentPassword\":\"$TEMP1\",\"newPassword\":\"$CAND_NEW_PASSWORD\"}"
check "Candidate changes password" 204

request "$CAND_JAR" GET /learners
check "Candidate cannot list learners" 403

request "$CAND_JAR" POST /learners "{\"name\":\"Sneaky\",\"email\":\"z.$STAMP@example.com\",\"cohort\":\"Cohort Test\"}"
check "Candidate cannot create accounts" 403

request "$CAND_JAR" POST "/learners/$LEARNER_ID/reset-password"
check "Candidate cannot reset passwords" 403

request "$COORD_JAR" POST "/learners/$LEARNER_ID/reset-password"
check "Coordinator resets candidate password" 200
TEMP2=$(echo "$BODY" | sed -E 's/.*"temporaryPassword":"([^"]+)".*/\1/')

request "$CAND_JAR" GET /auth/me
check "Candidate session ended by the reset" 401

request "$CAND_JAR" POST /auth/login "{\"email\":\"$TEST_EMAIL\",\"password\":\"$CAND_NEW_PASSWORD\"}"
check "Old password no longer works" 401

request "$CAND_JAR" POST /auth/login "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEMP2\"}"
check "New temporary password works" 200

# Make the temporary password expire, on purpose
psql -d "${DB_NAME:-lpt}" -q -c "UPDATE accounts SET temp_password_expires_at = NOW() - INTERVAL '1 hour' WHERE LOWER(email) = LOWER('$TEST_EMAIL');"

request "$CAND_JAR" POST /auth/login "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEMP2\"}"
check "Expired temporary password is rejected" 401

request "$COORD_JAR" POST "/learners/$LEARNER_ID/reset-password"
check "Coordinator reset fixes an expired password" 200
TEMP3=$(echo "$BODY" | sed -E 's/.*"temporaryPassword":"([^"]+)".*/\1/')

request "$CAND_JAR" POST /auth/login "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEMP3\"}"
check "Candidate signs in with the new temporary password" 200

request "$COORD_JAR" POST /learners/999999/reset-password
check "Reset for a missing learner gives 404" 404

request "$COORD_JAR" POST /auth/logout
check "Coordinator signs out" 204

# Remove the test candidate so your data stays clean
psql -d "${DB_NAME:-lpt}" -q -c "DELETE FROM accounts WHERE LOWER(email) = LOWER('$TEST_EMAIL');"
rm -f "$COORD_JAR" "$CAND_JAR"

if [ "$FAILS" -eq 0 ]; then echo "All checks passed."; else echo "$FAILS check(s) failed."; fi
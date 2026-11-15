#!/bin/bash
# Usage: bash scripts/check-candidate-flow.sh COORDINATOR_PASSWORD
COORD_PASSWORD="$1"
if [ -z "$COORD_PASSWORD" ]; then
  echo "Usage: bash scripts/check-candidate-flow.sh COORDINATOR_PASSWORD"
  exit 1
fi

URL="http://localhost:4000/api/v1"
COORD_JAR=$(mktemp)
A_JAR=$(mktemp)
B_JAR=$(mktemp)
COORD_EMAIL="coordinator@example.com"
STAMP=$(date +%s)
EMAIL_A="flow.a.$STAMP@example.com"
EMAIL_B="flow.b.$STAMP@example.com"
CAND_NEW_PASSWORD="CandidatePass2026"
DB="${DB_NAME:-lpt}"
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

check_contains() {
  if echo "$BODY" | grep -q "$2"; then
    echo "PASS  $1"
  else
    echo "FAIL  $1 (text not found)"
    FAILS=$((FAILS + 1))
  fi
}

check_not_contains() {
  if echo "$BODY" | grep -q "$2"; then
    echo "FAIL  $1 (text was found)"
    FAILS=$((FAILS + 1))
  else
    echo "PASS  $1"
  fi
}

# check_value LABEL EXPECTED ACTUAL
check_value() {
  if [ "$3" = "$2" ]; then
    echo "PASS  $1 (got $3)"
  else
    echo "FAIL  $1 (expected $2, got $3)"
    FAILS=$((FAILS + 1))
  fi
}

# Reads a number like "completed":4 from the last answer
number() {
  echo "$BODY" | sed -E "s/.*\"$1\":([0-9]+).*/\1/"
}

request "$COORD_JAR" GET /me/assignments
check "Signed out user cannot read My Training" 401

request "$COORD_JAR" POST /auth/login "{\"email\":\"$COORD_EMAIL\",\"password\":\"$COORD_PASSWORD\"}"
check "Coordinator signs in" 200

request "$COORD_JAR" POST /activities '{"title":"Candidate Check Activity","topic":"Testing","plannedHours":2}'
check "Create test activity" 201
ACTIVITY_ID=$(echo "$BODY" | sed -E 's/^\{"id":([0-9]+),.*/\1/')

request "$COORD_JAR" POST /learners "{\"name\":\"Flow Check A\",\"email\":\"$EMAIL_A\",\"cohort\":\"Cohort Test\"}"
check "Create test candidate A" 201
LEARNER_A=$(echo "$BODY" | sed -E 's/.*"learner":\{"id":([0-9]+).*/\1/')
TEMP_A=$(echo "$BODY" | sed -E 's/.*"temporaryPassword":"([^"]+)".*/\1/')

request "$COORD_JAR" POST /learners "{\"name\":\"Flow Check B\",\"email\":\"$EMAIL_B\",\"cohort\":\"Cohort Test\"}"
check "Create test candidate B" 201
LEARNER_B=$(echo "$BODY" | sed -E 's/.*"learner":\{"id":([0-9]+).*/\1/')
TEMP_B=$(echo "$BODY" | sed -E 's/.*"temporaryPassword":"([^"]+)".*/\1/')

request "$COORD_JAR" GET /cohort-summary
check "Read cohort summary before assigning" 200
COMPLETED_BEFORE=$(number completed)

request "$COORD_JAR" POST /assignments "{\"learnerId\":$LEARNER_A,\"activityId\":$ACTIVITY_ID}"
check "Assign activity to candidate A" 201
ASSIGN_A=$(echo "$BODY" | sed -E 's/^\{"id":([0-9]+),.*/\1/')

request "$A_JAR" POST /auth/login "{\"email\":\"$EMAIL_A\",\"password\":\"$TEMP_A\"}"
check "Candidate A signs in with temporary password" 200

request "$A_JAR" GET /me/assignments
check "Candidate A is locked until the password is changed" 403

request "$A_JAR" POST /auth/change-password "{\"currentPassword\":\"$TEMP_A\",\"newPassword\":\"$CAND_NEW_PASSWORD\"}"
check "Candidate A changes password" 204

request "$A_JAR" GET /me/assignments
check "Candidate A reads My Training" 200
check_contains "My Training shows the assigned activity" "Candidate Check Activity"

request "$B_JAR" POST /auth/login "{\"email\":\"$EMAIL_B\",\"password\":\"$TEMP_B\"}"
check "Candidate B signs in with temporary password" 200

request "$B_JAR" POST /auth/change-password "{\"currentPassword\":\"$TEMP_B\",\"newPassword\":\"$CAND_NEW_PASSWORD\"}"
check "Candidate B changes password" 204

request "$B_JAR" GET /me/assignments
check "Candidate B reads My Training" 200
check_value "Candidate B sees an empty list before any assignment" "[]" "$BODY"

request "$COORD_JAR" POST /assignments "{\"learnerId\":$LEARNER_B,\"activityId\":$ACTIVITY_ID}"
check "Assign the same activity to candidate B" 201
ASSIGN_B=$(echo "$BODY" | sed -E 's/^\{"id":([0-9]+),.*/\1/')

request "$A_JAR" PATCH "/assignments/$ASSIGN_A/status" '{"status":"In Progress"}'
check "Candidate A sets own status to In Progress" 200
check_contains "Answer shows the new status" "In Progress"

request "$A_JAR" PATCH "/assignments/$ASSIGN_A/status" '{"status":"Completed"}'
check "Candidate A sets own status to Completed" 200

request "$A_JAR" GET /me/assignments
check "Candidate A reads My Training again" 200
check_contains "Completed status was saved" "\"status\":\"Completed\""

request "$A_JAR" PATCH "/assignments/$ASSIGN_A/status" '{"status":"Finished"}'
check "Invalid status is rejected" 400

request "$A_JAR" PATCH "/assignments/$ASSIGN_A/status" '{}'
check "Missing status is rejected" 400

request "$A_JAR" PATCH "/assignments/$ASSIGN_B/status" '{"status":"Completed"}'
check "Candidate A cannot update candidate B's assignment" 403

request "$A_JAR" PATCH "/assignments/$ASSIGN_B/status" "{\"status\":\"Completed\",\"learnerId\":$LEARNER_B}"
check "A learner id sent in the body does not prove identity" 403

request "$A_JAR" PATCH /assignments/999999/status '{"status":"Completed"}'
check "Updating a missing assignment gives 404" 404

request "$A_JAR" GET "/me/assignments?learnerId=$LEARNER_B"
check "My Training ignores a learner id in the URL" 200
check_contains "Only candidate A's training is returned" "\"learnerId\":$LEARNER_A,"
check_not_contains "Nothing of candidate B is returned" "\"learnerId\":$LEARNER_B,"

request "$B_JAR" GET /me/assignments
check "Candidate B reads own My Training" 200
check_contains "Candidate B's status was not changed" "Not Started"

request "$COORD_JAR" GET /me/assignments
check "Coordinator cannot use the candidate My Training route" 403

request "$COORD_JAR" PATCH "/assignments/$ASSIGN_B/status" '{"status":"Completed"}'
check "Coordinator cannot update a status" 403

request "$COORD_JAR" GET /cohort-summary
check "Read cohort summary after the updates" 200
check_value "Completed count went up by one" "$((COMPLETED_BEFORE + 1))" "$(number completed)"

request "$A_JAR" POST /auth/logout
check "Candidate A signs out" 204

request "$A_JAR" GET /me/assignments
check "Signed out candidate cannot read My Training" 401

request "$A_JAR" PATCH "/assignments/$ASSIGN_A/status" '{"status":"Not Started"}'
check "Signed out candidate cannot update a status" 401

request "$B_JAR" POST /auth/logout
check "Candidate B signs out" 204

request "$COORD_JAR" POST /auth/logout
check "Coordinator signs out" 204

# Remove the test data so your data stays clean
psql -d "$DB" -q -c "DELETE FROM accounts WHERE LOWER(email) IN (LOWER('$EMAIL_A'), LOWER('$EMAIL_B'));"
psql -d "$DB" -q -c "DELETE FROM activities WHERE title LIKE 'Candidate Check Activity%';"
rm -f "$COORD_JAR" "$A_JAR" "$B_JAR"

if [ "$FAILS" -eq 0 ]; then echo "All checks passed."; else echo "$FAILS check(s) failed."; fi
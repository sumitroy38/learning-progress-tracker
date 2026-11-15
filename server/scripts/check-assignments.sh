#!/bin/bash
# Usage: bash scripts/check-assignments.sh COORDINATOR_PASSWORD
COORD_PASSWORD="$1"
if [ -z "$COORD_PASSWORD" ]; then
  echo "Usage: bash scripts/check-assignments.sh COORDINATOR_PASSWORD"
  exit 1
fi

URL="http://localhost:4000/api/v1"
COORD_JAR=$(mktemp)
CAND_JAR=$(mktemp)
COORD_EMAIL="coordinator@example.com"
STAMP=$(date +%s)
TEST_EMAIL="assign.$STAMP@example.com"
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

# check_value LABEL EXPECTED ACTUAL
check_value() {
  if [ "$3" = "$2" ]; then
    echo "PASS  $1 (got $3)"
  else
    echo "FAIL  $1 (expected $2, got $3)"
    FAILS=$((FAILS + 1))
  fi
}

# Reads a number like "learners":4 from the last answer
number() {
  echo "$BODY" | sed -E "s/.*\"$1\":([0-9]+).*/\1/"
}

request "$COORD_JAR" POST /assignments '{"learnerId":1,"activityId":1}'
check "Signed out user cannot assign" 401

request "$COORD_JAR" POST /auth/login "{\"email\":\"$COORD_EMAIL\",\"password\":\"$COORD_PASSWORD\"}"
check "Coordinator signs in" 200

request "$COORD_JAR" POST /activities '{"title":"Assignment Check Activity","topic":"Testing","plannedHours":1.5}'
check "Create test activity" 201
ACTIVITY_ID=$(echo "$BODY" | sed -E 's/^\{"id":([0-9]+),.*/\1/')

request "$COORD_JAR" POST /learners "{\"name\":\"Assign Check\",\"email\":\"$TEST_EMAIL\",\"cohort\":\"Cohort Test\"}"
check "Create test candidate" 201
LEARNER_ID=$(echo "$BODY" | sed -E 's/.*"learner":\{"id":([0-9]+).*/\1/')
TEMP=$(echo "$BODY" | sed -E 's/.*"temporaryPassword":"([^"]+)".*/\1/')

request "$COORD_JAR" GET /cohort-summary
check "Read cohort summary before assigning" 200
LEARNERS_BEFORE=$(number learners)
ASSIGNMENTS_BEFORE=$(number assignments)
COMPLETED_BEFORE=$(number completed)

request "$COORD_JAR" POST /assignments "{\"learnerId\":$LEARNER_ID,\"activityId\":$ACTIVITY_ID}"
check "Assign activity to learner" 201
check_contains "Assignment answer includes activity details" "Assignment Check Activity"
ASSIGNMENT_ID=$(echo "$BODY" | sed -E 's/^\{"id":([0-9]+),.*/\1/')

request "$COORD_JAR" POST /assignments "{\"learnerId\":$LEARNER_ID,\"activityId\":$ACTIVITY_ID}"
check "Duplicate assignment is rejected" 409

request "$COORD_JAR" POST /assignments "{\"activityId\":$ACTIVITY_ID}"
check "Missing learner is rejected" 400

request "$COORD_JAR" POST /assignments "{\"learnerId\":$LEARNER_ID}"
check "Missing activity is rejected" 400

request "$COORD_JAR" POST /assignments "{\"learnerId\":\"abc\",\"activityId\":$ACTIVITY_ID}"
check "Id that is not a number is rejected" 400

request "$COORD_JAR" POST /assignments "{\"learnerId\":999999,\"activityId\":$ACTIVITY_ID}"
check "Assigning to a missing learner gives 404" 404

request "$COORD_JAR" POST /assignments "{\"learnerId\":$LEARNER_ID,\"activityId\":999999}"
check "Assigning a missing activity gives 404" 404

request "$COORD_JAR" GET "/learners/$LEARNER_ID/assignments"
check "Coordinator views learner progress" 200
check_contains "Progress shows the assigned activity" "Assignment Check Activity"

request "$COORD_JAR" GET /learners/999999/assignments
check "Progress of a missing learner gives 404" 404

request "$COORD_JAR" GET /cohort-summary
check "Read cohort summary after assigning" 200
check_value "Learner count is unchanged" "$LEARNERS_BEFORE" "$(number learners)"
check_value "Assignment count went up by one" "$((ASSIGNMENTS_BEFORE + 1))" "$(number assignments)"
check_value "Completed count is unchanged" "$COMPLETED_BEFORE" "$(number completed)"

# Mark it Completed straight in the database, then the summary must follow
psql -d "$DB" -q -c "UPDATE assignments SET status = 'Completed' WHERE id = $ASSIGNMENT_ID;"
request "$COORD_JAR" GET /cohort-summary
check_value "Completed count follows the saved data" "$((COMPLETED_BEFORE + 1))" "$(number completed)"

request "$CAND_JAR" POST /auth/login "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEMP\"}"
check "Candidate signs in with temporary password" 200

request "$CAND_JAR" POST /assignments "{\"learnerId\":$LEARNER_ID,\"activityId\":$ACTIVITY_ID}"
check "Locked candidate cannot assign" 403

request "$CAND_JAR" POST /auth/change-password "{\"currentPassword\":\"$TEMP\",\"newPassword\":\"$CAND_NEW_PASSWORD\"}"
check "Candidate changes password" 204

request "$CAND_JAR" POST /assignments "{\"learnerId\":$LEARNER_ID,\"activityId\":$ACTIVITY_ID}"
check "Candidate cannot assign" 403

request "$CAND_JAR" GET "/learners/$LEARNER_ID/assignments"
check "Candidate cannot view learner progress" 403

request "$CAND_JAR" GET /cohort-summary
check "Candidate cannot read the cohort summary" 403

request "$COORD_JAR" POST /auth/logout
check "Coordinator signs out" 204

# Remove the test data so your data stays clean
psql -d "$DB" -q -c "DELETE FROM accounts WHERE LOWER(email) = LOWER('$TEST_EMAIL');"
psql -d "$DB" -q -c "DELETE FROM activities WHERE title LIKE 'Assignment Check Activity%';"
rm -f "$COORD_JAR" "$CAND_JAR"

if [ "$FAILS" -eq 0 ]; then echo "All checks passed."; else echo "$FAILS check(s) failed."; fi
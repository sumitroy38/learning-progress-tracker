#!/bin/bash
# Usage: bash scripts/check-auth.sh TEMP_PASSWORD NEW_PASSWORD
TEMP="$1"
NEW="$2"
if [ -z "$TEMP" ] || [ -z "$NEW" ]; then
  echo "Usage: bash scripts/check-auth.sh TEMP_PASSWORD NEW_PASSWORD"
  exit 1
fi

URL="http://localhost:4000/api/v1"
JAR=$(mktemp)
EMAIL="coordinator@example.com"

token() {
  curl -s -c "$JAR" -b "$JAR" "$URL/auth/csrf-token" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/'
}

# call LABEL EXPECTED_STATUS METHOD PATH [JSON_BODY] [notoken]
call() {
  local label="$1" expected="$2" method="$3" path="$4" body="$5" notoken="$6"
  [ -z "$body" ] && body='{}'
  local args=(-s -o /dev/null -w "%{http_code}" -c "$JAR" -b "$JAR" -X "$method" "$URL$path")
  if [ "$method" != "GET" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
    if [ -z "$notoken" ]; then
      args+=(-H "x-csrf-token: $(token)")
    fi
  fi
  local status
  status=$(curl "${args[@]}")
  if [ "$status" = "$expected" ]; then
    echo "PASS  $label (got $status)"
  else
    echo "FAIL  $label (expected $expected, got $status)"
  fi
}

call "Login without CSRF token is blocked" 403 POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$TEMP\"}" notoken
call "Wrong password gives generic error" 401 POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}"
call "Temporary password signs in" 200 POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$TEMP\"}"
call "Locked session cannot reach other routes" 403 GET /activities
call "Locked session can ask who it is" 200 GET /auth/me
call "Wrong current password is rejected" 401 POST /auth/change-password "{\"currentPassword\":\"wrong\",\"newPassword\":\"$NEW\"}"
call "Too short new password is rejected" 400 POST /auth/change-password "{\"currentPassword\":\"$TEMP\",\"newPassword\":\"short\"}"
call "Password change works" 204 POST /auth/change-password "{\"currentPassword\":\"$TEMP\",\"newPassword\":\"$NEW\"}"
call "Lock is lifted after the change" 404 GET /activities
call "Logout works" 204 POST /auth/logout
call "Signed out user is rejected" 401 GET /auth/me
call "Old temporary password no longer works" 401 POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$TEMP\"}"
call "New password works" 200 POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$NEW\"}"
call "Logout again" 204 POST /auth/logout

rm -f "$JAR"
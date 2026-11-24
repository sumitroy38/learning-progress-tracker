# API reference

This page lists every web address the server offers. It is meant to be read by people and to be copied from. Every example uses made up data.

## The basics

* **Base address.** Every address starts with `/api/v1`. On your computer the full start is `http://localhost:4000/api/v1`. On the live site it is `https://learning-progress-tracker-q7rt.onrender.com/api/v1`.
* **Data format.** Requests and answers use JSON, which is a simple text format for data.
* **Signing in.** After a successful login the server sets a cookie named `lpt.sid`. The browser sends it back by itself. You do not send passwords again.
* **Changing data needs a CSRF token.** Any request that is not a GET must carry a header called `x-csrf-token`. You get the token from `GET /auth/csrf-token`. It is tied to your current session, so ask for a new one after signing in and before each change.
* **Methods.** GET reads data. POST creates something or performs an action. PUT replaces something. PATCH changes part of something.

## A first try with curl

`curl` is a command line tool that sends web requests. This shows the full pattern: get a token, sign in, get a new token, read data.

```
BASE=http://localhost:4000/api/v1
JAR=$(mktemp)

# 1. Get a token (the cookie is saved in the jar file)
TOKEN=$(curl -s -c $JAR -b $JAR $BASE/auth/csrf-token | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')

# 2. Sign in
curl -s -c $JAR -b $JAR -X POST $BASE/auth/login \
  -H "Content-Type: application/json" -H "x-csrf-token: $TOKEN" \
  -d '{"email":"coordinator@example.com","password":"YOUR_PASSWORD"}'

# 3. A reading call needs only the cookie
curl -s -c $JAR -b $JAR $BASE/cohort-summary
```

If the second step is followed by a change (a POST, PUT or PATCH), ask for a fresh token again first. The session changes at login, and the token follows the session.

## Who can call what

| Group | Addresses |
| --- | --- |
| Anyone | `GET /health`, `GET /auth/csrf-token`, `POST /auth/login` |
| Any signed in person | `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout` |
| Coordinator only | Everything under `/activities`, `/learners`, `/cohort-summary`, and `POST /assignments` |
| Candidate only | `PATCH /assignments/{id}/status`, `GET /me/assignments` |

A person who still has a temporary password can only use the six addresses allowed by the first login gate: `/health`, `/auth/csrf-token`, `/auth/login`, `/auth/me`, `/auth/change-password` and `/auth/logout`. Everything else answers 403 until they change it.

## Answer codes

| Code | Meaning | Example message |
| --- | --- | --- |
| 200 | Done, here is the data | |
| 201 | Created | |
| 204 | Done, nothing to send back | |
| 400 | The input is wrong or missing | `Planned hours must be greater than zero.` |
| 401 | Not signed in, or wrong credentials | `Invalid email or password.` |
| 403 | Signed in, but not allowed | `You do not have permission to do this.` |
| 404 | The thing was not found | `Learner not found.` |
| 409 | It already exists | `Assignment already exists.` |
| 429 | Too many tries | `Too many login attempts. Please try again later.` |
| 500 | A server problem | `Something went wrong.` |

Errors always come back as a small JSON object with one field: `{ "message": "..." }`.

Other messages you may see: `Please sign in.` (401, no session), `Invalid or missing CSRF token.` (403), `Please change your temporary password first.` (403), `Request body is not valid JSON.` (400), and `Not found.` (404, for an unknown address under /api).

## Authentication

### `GET /health`

Says the server is alive. Used by hosting platforms and for quick checks.

Answer 200: `{ "status": "ok" }`

### `GET /auth/csrf-token`

Gives a fresh CSRF token and starts a session cookie.

Answer 200: `{ "csrfToken": "..." }`

### `POST /auth/login`

Signs in. Limited to 10 tries per 15 minutes for each visitor.

Send: `{ "email": "asha.verma@example.com", "password": "..." }`

Answer 200: `{ "role": "Candidate", "mustChangePassword": true }`

Errors: 400 if the email or password is missing, 401 for any wrong or expired credentials (always the same message), 429 when the limit is reached.

An expired temporary password gets the same 401 message as a wrong password, on purpose.

### `GET /auth/me`

Says who is signed in. The screens call this on every page load, so a refresh keeps you signed in.

Answer 200: `{ "role": "Coordinator", "mustChangePassword": false }`

### `POST /auth/change-password`

Sets a new password. This also ends every other session of the account. Limited to 10 tries per 15 minutes.

Send: `{ "currentPassword": "...", "newPassword": "..." }`

Answer 204, no body.

Errors, all 400 unless noted:

* `Current password and new password are required.`
* `New password must be at least 10 characters.`
* `New password is too long.` (more than 72 bytes)
* `New password must be different.`
* 401 `Current password is incorrect.`
* 401 `Your temporary password has expired. Ask your coordinator for a new one.`

### `POST /auth/logout`

Ends the session and clears the cookies. Answer 204.

## Activities (coordinator only)

An activity looks like this:

```
{ "id": 1, "title": "React Basics", "topic": "Frontend", "plannedHours": 6 }
```

| Field | Rule |
| --- | --- |
| `title` | Required, up to 120 characters |
| `topic` | Required, up to 60 characters |
| `plannedHours` | Required, a number from 0.01 to 999. It must be a number, not text |

### `GET /activities`

Answer 200: a list of activities, oldest first.

### `POST /activities`

Send the three fields. Answer 201 with the new activity. Errors: 400 with the first problem found, for example `Title is required.` or `Planned hours must be a number.`

### `PUT /activities/{id}`

Send all three fields. Answer 200 with the updated activity. Errors: 400, or 404 `Activity not found.`

## Learners (coordinator only)

"Learner" and "candidate" mean the same person.

### `GET /learners`

Answer 200:

```
[ { "id": 1, "name": "Asha Verma", "email": "asha.verma@example.com", "cohort": "Cohort A" } ]
```

### `POST /learners`

Creates the account and the learner profile together. Either both are saved or neither is.

Send: `{ "name": "Asha Verma", "email": "asha.verma@example.com", "cohort": "Cohort A" }`

Rules: all three are required. Name up to 100 characters, cohort up to 60, email valid and up to 254. The email is saved in lower case.

Answer 201:

```
{
  "learner": { "id": 1, "name": "Asha Verma", "email": "asha.verma@example.com", "cohort": "Cohort A" },
  "credentials": {
    "username": "asha.verma@example.com",
    "temporaryPassword": "k3Jx9...",
    "expiresAt": "2026-01-02T10:00:00.000Z"
  }
}
```

The temporary password appears here and nowhere else. It cannot be looked up later. The answer is marked so the browser does not keep a copy.

Errors: 400 for a missing or invalid field, 409 `An account with this email already exists.`

### `POST /learners/{id}/reset-password`

Makes a new temporary password valid for 24 hours, forces a change at next login, and signs the candidate out everywhere.

Answer 200: `{ "credentials": { "username": "...", "temporaryPassword": "...", "expiresAt": "..." } }`

Error: 404 `Learner not found.`

### `GET /learners/{id}/assignments`

Shows one learner's assignments. Answer 200: a list of assignments (see below). Error: 404 `Learner not found.`

## Assignments

An assignment looks like this:

```
{
  "id": 5,
  "learnerId": 1,
  "status": "In Progress",
  "activity": { "id": 2, "title": "Node and Express", "topic": "Backend", "plannedHours": 8 }
}
```

### `POST /assignments` (coordinator only)

Send: `{ "learnerId": 1, "activityId": 2 }`

Answer 201 with the new assignment. The starting status is Not Started.

Errors: 400 `Learner and activity are required.`, 404 `Learner not found.` or `Activity not found.`, 409 `Assignment already exists.`

### `PATCH /assignments/{id}/status` (candidate only)

Send: `{ "status": "Completed" }`. The status must be exactly Not Started, In Progress or Completed.

Answer 200 with the updated assignment.

Errors: 400 `Status must be Not Started, In Progress or Completed.`, 404 `Assignment not found.`, and 403 `You can only update your own training.` when the assignment belongs to someone else.

## Me (candidate only)

### `GET /me/assignments`

The signed in candidate's own assignments. There is no learner id to send, because the server finds you from your session. Answer 200: a list of assignments. Error: 404 `Learner not found.` if the account has no profile.

## Cohort summary (coordinator only)

### `GET /cohort-summary`

Counted from the saved data every time.

Answer 200: `{ "learners": 3, "assignments": 7, "completed": 2 }`

## Good to know

* An id in the address that is not a whole positive number gets a 404, not an error page.
* Unknown addresses under `/api` answer 404 with `Not found.`
* Answers from `/api` are marked so browsers never keep a copy.
* Passwords and password hashes are never part of any answer, except the one time temporary password described above.

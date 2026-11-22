# Learning Progress Tracker

A full stack web app for running a training cohort. A coordinator adds candidates, hands each one a starting password, assigns learning activities, and follows everyone's progress. Candidates sign in, choose their own password, and update only their own training.

**Live site:** https://learning-progress-tracker-q7rt.onrender.com

> **Good to know.** The live site runs on a free plan, so it goes to sleep after 15 minutes without visitors. The first page load after a sleep can take about one minute while it wakes up. After that it is fast. Coordinator accounts are private, so the live site cannot be signed into by the public. To see everything working, follow the setup below. It takes about 10 minutes and uses fake data only.

Every name and activity in this project is made up. No real people or real data are used.

## Contents

1. [What you can do](#what-you-can-do)
2. [The big picture](#the-big-picture)
3. [How sign in works](#how-sign-in-works)
4. [The life of a password](#the-life-of-a-password)
5. [A normal day in the app](#a-normal-day-in-the-app)
6. [The data model](#the-data-model)
7. [Security, layer by layer](#security-layer-by-layer)
8. [Technology used, and why](#technology-used-and-why)
9. [Run it on your computer](#run-it-on-your-computer)
10. [Tests](#tests)
11. [The API](#the-api)
12. [How it is hosted for free](#how-it-is-hosted-for-free)
13. [Project folders](#project-folders)
14. [Known limits](#known-limits)
15. [If something goes wrong](#if-something-goes-wrong)

## What you can do

A coordinator can:

* Add and edit learning activities (title, topic and planned hours)
* Add a candidate and hand over a starting password that is shown only once
* Reset a candidate's password
* Assign activities to candidates and see each candidate's progress
* See cohort totals: learners, assignments and completed assignments

A candidate can:

* Sign in with the starting password, then choose a new one
* Open "My Training" and set each activity to Not Started, In Progress or Completed
* See and change only their own training

## The big picture

One small server does two jobs. It answers API calls, and it also hands out the React screens. This keeps the whole project as a single website with a single address. The data lives in a separate PostgreSQL database.

```mermaid
flowchart LR
    U["Browser<br/>(coordinator or candidate)"]
    subgraph R["Render free web service"]
        E["Express server<br/>the API under /api/v1"]
        F["React screens<br/>built files"]
    end
    N[("Neon PostgreSQL<br/>accounts, learners,<br/>activities, assignments,<br/>sessions")]
    U -->|"HTTPS"| E
    E -->|"serves the pages"| F
    E -->|"SQL over a secure connection"| N
```

Words used above:

* **API** (Application Programming Interface) is a set of web addresses that the screens call to read and save data.
* **React** builds the screens from small reusable parts.
* **Express** is a Node.js library that receives web requests and sends answers.
* **PostgreSQL** is the database that keeps the data safe on disk.

## How sign in works

This is what happens, step by step, when someone signs in.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Express server
    participant D as PostgreSQL
    B->>S: Ask for a CSRF token
    S-->>B: Token, plus a small cookie
    B->>S: Send email, password and the token
    S->>D: Find the account by lowercase email
    D-->>S: Account with its password hash
    S->>S: bcrypt compares the password with the hash
    alt Password is correct and not expired
        S->>D: Save a session
        S-->>B: Signed in. A random session id is stored in an HttpOnly cookie
    else Anything is wrong
        S-->>B: 401 Invalid email or password
    end
```

What the words mean:

* **CSRF** (Cross Site Request Forgery) is an attack where another website secretly sends requests as you. The token proves a request really came from our own screens.
* **Hash** is a scrambled one way copy of a password. It cannot be turned back into the password. bcrypt adds random extra data (a **salt**) first, so two people with the same password get different hashes.
* **Session** is the server's memory that you are signed in. The browser keeps only a random id in a cookie.
* **HttpOnly** means page scripts cannot read the cookie, which blocks a common theft trick.

A wrong email and a wrong password give the same message, so nobody can use the form to find out which emails exist.

## The life of a password

A coordinator never knows a candidate's real password. The coordinator only creates a short lived starting password.

```mermaid
stateDiagram-v2
    [*] --> Temporary: Coordinator adds the candidate
    Temporary --> Chosen: Candidate signs in and picks a new password
    Temporary --> Expired: 24 hours pass
    Expired --> Temporary: Coordinator uses Reset password
    Chosen --> Temporary: Coordinator uses Reset password
    Chosen --> [*]
```

While a password is Temporary, the server allows only two things: changing the password and signing out. This rule is enforced on the server, so hiding buttons on the screen is not what protects it.

## A normal day in the app

```mermaid
flowchart TD
    A["Coordinator signs in"] --> B["Adds activities"]
    B --> C["Adds a candidate<br/>and sees the starting password once"]
    C --> D["Candidate signs in<br/>and chooses a new password"]
    D --> E["Coordinator assigns activities"]
    E --> F["Candidate opens My Training<br/>and sets a status"]
    F --> G["Coordinator sees the progress bar<br/>and the cohort totals update"]
```

A longer demo script with talking points is in [docs/DEMO.md](docs/DEMO.md).

## The data model

Four tables hold the business data. A fifth table, `session`, holds login sessions.

```mermaid
erDiagram
    ACCOUNTS ||--o| LEARNERS : "candidate has one profile"
    LEARNERS ||--o{ ASSIGNMENTS : "receives"
    ACTIVITIES ||--o{ ASSIGNMENTS : "is given as"

    ACCOUNTS {
        int id PK
        text email "unique, any letter case"
        text password_hash
        text role "Coordinator or Candidate"
        boolean must_change_password
        timestamptz temp_password_expires_at
    }
    LEARNERS {
        int id PK
        text display_name
        text cohort
        int account_id FK
    }
    ACTIVITIES {
        int id PK
        text title
        text topic
        numeric planned_hours "above zero"
    }
    ASSIGNMENTS {
        int id PK
        int learner_id FK
        int activity_id FK
        text status "Not Started, In Progress or Completed"
    }
```

Each rule is checked twice. The API checks first and gives a friendly message. The database checks again, so bad data is refused even if the API has a bug. More detail is in [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Security, layer by layer

Every request passes through these layers, in this order. A request that fails any layer is stopped there.

```mermaid
flowchart TD
    R["Incoming request"] --> H["1. Helmet adds safe security headers"]
    H --> S["2. Session: who is this?"]
    S --> C["3. CSRF token check"]
    C --> G["4. First login gate:<br/>must the password be changed?"]
    G --> RL["5. Role check:<br/>Coordinator or Candidate?"]
    RL --> V["6. Input checks with friendly messages"]
    V --> Q["7. SQL with parameters"]
    Q --> DB[("8. Database rules<br/>CHECK, UNIQUE, FOREIGN KEY")]
```

The main choices:

* Passwords are saved only as salted bcrypt hashes with cost 12. Hashes are never sent in any answer, and passwords are never logged.
* Starting passwords are random and expire after 24 hours. Answers that contain them tell the browser not to keep a copy.
* Session cookies are HttpOnly and SameSite, which stops other websites from sending them. They also use the Secure setting in production, so they travel only over HTTPS. Sessions end after 2 hours without activity.
* Login is limited to 10 tries per 15 minutes for each visitor. This was tested on the live site.
* Changing or resetting a password ends the other sessions of that account.
* The server decides who you are from your session. An id sent in a web address or request body is never trusted for identity.
* SQL values are always passed as parameters, so nobody can sneak commands in through input.

## Technology used, and why

| Part | Tool | Why it was chosen |
| --- | --- | --- |
| Screens | React 19 with Vite 8 | React builds pages from small parts. Vite starts fast and builds the final files. |
| Styling | Tailwind CSS 4 | Styles are written as small ready made classes next to the markup. |
| Server | Node.js with Express 5 | The same language, JavaScript, is used on both sides. |
| Database | PostgreSQL with the `pg` driver | A real relational database. Plain SQL keeps the rules easy to see. |
| Passwords | bcrypt | Slow on purpose, so guessing passwords is expensive. |
| Sessions | `express-session` with `connect-pg-simple` | Sessions live in the database, so a server restart does not sign everyone out. |
| CSRF | `csrf-csrf` | Blocks requests that did not come from our own screens. |
| Headers | helmet | Adds a set of safe web headers with one line. |
| Rate limit | `express-rate-limit` | Slows down repeated login tries. |
| Tests | Jest and Supertest | Supertest sends fake web requests to the app without opening a real port. |
| Hosting | Render and Neon | Both have a free plan that needs no credit card. |

## Run it on your computer

You need three tools:

* **Node.js version 22 or newer.** It runs JavaScript outside the browser and installs npm, the tool that downloads code libraries (packages). Check with `node -v`.
* **PostgreSQL version 14 or newer.** Check with `psql --version`.
* **Git.** Check with `git --version`.

Everything runs on your own computer, so nothing costs money. Do these steps once, in order.

### 1. Get the code

```
git clone https://github.com/sumitroy38/learning-progress-tracker.git
cd learning-progress-tracker
```

### 2. Install the packages

```
cd server
npm install
cd ..
cd client
npm install
cd ..
```

### 3. Create two databases

```
createdb lpt
createdb lpt_test
```

`lpt` holds the real data. `lpt_test` is a separate database that the automated tests are allowed to erase, so a test run can never delete your real data.

### 4. Add your settings

```
cp server/.env.example server/.env
```

Open `server/.env` and fill in each line:

* `PORT` is where the API listens. The default, 4000, is fine.
* `DATABASE_URL` is the address of the main database, like `postgres://USER:PASSWORD@localhost:5432/lpt`. If your PostgreSQL has no password, leave that part out.
* `TEST_DATABASE_URL` is the same address, but ending in `lpt_test`.
* `SESSION_SECRET` is a long random text used to sign login cookies. Make one with:

```
cd server
npm run secret
cd ..
```

The `.env` file is private. Git ignores it on purpose, so never commit or share it.

### 5. Create the tables

```
cd server
npm run db:init
```

This builds the tables from `server/db/schema.sql`. It deletes old tables first, so it asks you to type the database name before it does anything.

### 6. Create the first coordinator

```
npm run coordinator:create
```

It asks for an email and a password of at least 10 characters. The password is hidden while you type. This is the only way to make the first coordinator. The app has no public sign up page, and no password is written in the code.

### 7. Add demo data (optional)

```
npm run db:seed
```

This adds 3 made up candidates and 4 made up activities, and prints each starting password once. They stop working after 24 hours. After that, use Reset password as the coordinator.

### 8. Start the app

Use two terminals and leave both open.

```
cd server
npm run dev
```

```
cd client
npm run dev
```

Open http://localhost:5173/ and sign in with the coordinator from step 6. The screens forward every call that starts with /api to the API on port 4000, so the login cookies work without extra settings.

## Tests

```
cd server
npm run db:init:test
npm test
```

The first command prepares the test database and asks you to type its name. The second runs everything and takes about 1 to 2 minutes, because passwords are hashed slowly on purpose. All 9 test files and 124 tests pass.

```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#0d9488"}}}}%%
xychart-beta
    title "Automated tests per file (124 in total)"
    x-axis ["assignments", "auth", "learners", "activities", "middleware", "utils", "login", "workflow", "limit"]
    y-axis "Number of tests" 0 --> 35
    bar [31, 20, 18, 17, 15, 13, 8, 1, 1]
```

The tests cover:

* Required fields and valid values for activities, candidates and assignments
* Duplicate emails in any letter case, and duplicate assignments
* Wrong, unknown and expired credentials, with the same generic error for each
* The first login lock, which allows only a password change and sign out
* Sign out, session expiry and login rate limiting
* Coordinator only actions, and a candidate being refused when they try to read or change another candidate's training
* The whole main workflow, from creating a candidate to the cohort totals

The unit tests use mocks, which are fake stand ins for the database and the password tool, so each test checks only one piece of logic. The other tests use the real test database. The tests refuse to run unless the database name contains the word test.

## The API

Every address starts with /api/v1. Success codes are shown in brackets.

```mermaid
pie showData
    title Who can call each of the 17 API addresses
    "Anyone" : 3
    "Any signed in user" : 3
    "Coordinator only" : 9
    "Candidate only" : 2
```

| Address | What it does | Who can use it |
| --- | --- | --- |
| `GET /health` | Says the server is alive [200] | Anyone |
| `GET /auth/csrf-token` | Gives a CSRF token [200] | Anyone |
| `POST /auth/login` | Signs in, rate limited [200] | Anyone |
| `GET /auth/me` | Says who is signed in [200] | Signed in |
| `POST /auth/change-password` | Sets a new password [204] | Signed in |
| `POST /auth/logout` | Signs out [204] | Signed in |
| `GET /activities` | Lists activities [200] | Coordinator |
| `POST /activities` | Adds an activity [201] | Coordinator |
| `PUT /activities/{id}` | Edits an activity [200] | Coordinator |
| `GET /learners` | Lists learners [200] | Coordinator |
| `POST /learners` | Adds a candidate and returns one time credentials [201] | Coordinator |
| `POST /learners/{id}/reset-password` | Makes new temporary credentials and ends old sessions [200] | Coordinator |
| `GET /learners/{id}/assignments` | Shows one learner's progress [200] | Coordinator |
| `POST /assignments` | Assigns an activity to a learner [201] | Coordinator |
| `GET /cohort-summary` | Shows learner, assignment and completed counts [200] | Coordinator |
| `PATCH /assignments/{id}/status` | Updates the status of your own assignment [200] | Candidate |
| `GET /me/assignments` | Shows My Training [200] | Candidate |

Errors come back as a short message, such as `{ "message": "Assignment already exists." }`. The codes are 400 for bad input, 401 for not signed in or wrong credentials, 403 for not allowed, 404 for not found, 409 for a duplicate, and 429 for too many login tries.

## How it is hosted for free

The live site costs nothing and needs no credit card.

* **Render** runs the Node server. It builds the React screens and serves them together with the API. It deploys again by itself whenever new code is pushed to the `main` branch.
* **Neon** runs the PostgreSQL database.

Render settings: the build command is `npm run build`, and the start command is `npm start`. These settings are given to the server as environment variables, which are named values kept outside the code:

| Name | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production`. This turns on secure cookies and HTTPS only rules. |
| `SERVE_CLIENT` | Set to `true`. The server then also serves the React screens. |
| `SESSION_SECRET` | The long random text that signs login cookies. |
| `DATABASE_URL` | The address of the Neon database. |
| `TRUST_PROXY_HOPS` | How many helper servers sit between a visitor and the app. Set to 3 on Render, so the login limit sees the real visitor. |

Two things on the free plans are worth knowing:

* Render puts a free service to sleep after 15 minutes without visitors. The first visit afterwards takes about a minute.
* Neon also pauses an idle database. The server is written to survive this. It handles a closed idle connection and simply opens a new one when needed.

## Project folders

```
client/         React screens
  src/pages/    One file per screen
  src/components/  Shared pieces such as buttons and fields
server/         The API
  src/          App code: routes, middleware, database, CSRF
  db/           Table definitions and setup scripts
  tests/        Automated tests
docs/           Demo script and data model notes
package.json    Build and start commands used by the host
```

## Known limits

* Starting passwords are handed over by hand. Sending email is not included.
* A coordinator who forgets their own password must be recovered by whoever runs the server, directly in the database. Candidates can always be reset by the coordinator.
* Deleting candidates and editing their details are not included.
* The free hosting sleeps when idle, as explained above.

## If something goes wrong

* **The screens say they cannot reach the server.** The API is not running. Start it and press Try again. On the live site, wait a minute for it to wake up.
* **Sign in says too many attempts.** Wait 15 minutes, or restart the API.
* **A candidate cannot sign in.** The starting password may have expired. Use Reset password as the coordinator.
* **A script says the tables do not exist.** Run `npm run db:init` in the server folder.
* **The tests refuse to run.** Check that `TEST_DATABASE_URL` is set and that the database name contains the word test.

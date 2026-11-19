# Learning Progress Tracker

A small web app for a training cohort. A coordinator adds candidates, gives each one a starting password, assigns learning activities, and follows progress. Candidates sign in, choose their own password, and update only their own training.

Every name and activity in this project is made up. No real people or real data are used.

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

## Before you start

You need three tools on your computer.

* **Node.js version 18 or newer.** Node.js runs JavaScript outside the browser. It also installs npm, the tool that downloads code libraries (called packages). Check it with `node -v`.
* **PostgreSQL version 14 or newer.** PostgreSQL is the database that stores all the data. Check it with `psql --version`.
* **Git.** Git downloads the project. Check it with `git --version`.

Everything runs on your own computer, so nothing costs money.

## Setup

Do these steps once, in order.

### 1. Get the code

```
git clone YOUR_REPOSITORY_URL
```

Open a terminal inside the new project folder. Every step below starts from that folder.

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

The first one, `lpt`, holds the real data. The second one, `lpt_test`, is a separate database that the automated tests are allowed to erase. Keeping them apart means a test run can never delete your real data.

If `createdb` says your user or password is not accepted, your PostgreSQL needs a user name and password. Use the ones you chose when you installed it.

### 4. Add your settings

Copy the example settings file:

```
cp server/.env.example server/.env
```

Open `server/.env` and fill in each line:

* `PORT` is where the API listens. The default, 4000, is fine.
* `DATABASE_URL` is the address of the main database. It looks like `postgres://USER:PASSWORD@localhost:5432/lpt`. If your PostgreSQL has no password, leave the password part out, like `postgres://USER@localhost:5432/lpt`.
* `TEST_DATABASE_URL` is the same address, but ending in `lpt_test`.
* `SESSION_SECRET` is a long random text that the server uses to sign login cookies. A cookie is a small piece of data the browser keeps to show you are signed in. Make the secret like this, then paste the result into the file:

```
cd server
npm run secret
cd ..
```

The `.env` file is private. Git ignores it on purpose, so never commit it or share it.

### 5. Create the tables

```
cd server
npm run db:init
```

This builds the tables from the file `server/db/schema.sql`. It deletes any old tables first, so it asks you to type the database name before it does anything.

### 6. Create the first coordinator

```
npm run coordinator:create
```

It asks for an email and a password. The password needs at least 10 characters, and it is hidden while you type. It is saved only as a salted hash, which is a scrambled one way copy that cannot be turned back into the password.

This is the only way to make the first coordinator. The app has no public sign up page, and no password is written in the code.

### 7. Add demo data (optional)

```
npm run db:seed
```

This adds 3 made up candidates and 4 made up activities. It prints each candidate's starting password once. Copy them if you need them. The starting passwords stop working after 24 hours. After that, the coordinator can make a new one with the Reset password button.

## Run the app

Use two terminals, and leave both open.

Terminal 1, the API:

```
cd server
npm run dev
```

Terminal 2, the screens:

```
cd client
npm run dev
```

Open http://localhost:5173/ in your browser and sign in with the coordinator email and password from step 6.

The screens forward every call that starts with /api to the API on port 4000. Because the browser sees only one address, the login cookies work without extra settings.

## Try the main workflow

1. Sign in as the coordinator. The totals at the top show your cohort.
2. In the Activities tab, add an activity. Try 0 planned hours to see the error message.
3. In the Candidates tab, click Add candidate. A yellow panel shows the username and starting password once. Hand them over privately.
4. Add the same email again. The form says the email is already used.
5. Select the candidate and assign an activity. The totals update.
6. Click Sign out. Sign in as the candidate with the starting password. You must choose a new password before you can see anything else.
7. Open My Training and set a status, then click Save. Refresh the page. The status is still there.
8. Sign in as the coordinator again. The progress bar and totals now match.

A longer demo script with talking points is in `docs/DEMO.md`.

## Run the automated tests

```
cd server
npm run db:init:test
npm test
```

The first command prepares the test database, and it asks you to type its name. The second runs every test. It takes about 1 to 2 minutes, because passwords are hashed slowly on purpose. At the time of writing, all 9 test files and 124 tests pass.

The tests cover:

* Required fields and valid values for activities, candidates and assignments
* Duplicate emails, in any letter case, and duplicate assignments
* Wrong, unknown and expired credentials, with the same generic error for each
* The first login lock, which allows only a password change and sign out
* Sign out, session expiry and login rate limiting
* Coordinator only actions, and a candidate being refused when they try to read or change another candidate's training
* The whole main workflow from creating a candidate to the cohort totals

The unit tests use mocks. A mock is a fake stand in, here for the database and the password tool, so a test checks only the login logic. The other tests use the real test database.

The tests refuse to run unless the database name contains the word test. This protects your real data.

## How it is built

* **React and Vite** make the screens. React builds the pages from small parts. Vite runs and builds it.
* **Node.js and Express** make the REST API. A REST API is a set of web addresses, such as /api/v1/activities, that the screens call to read and save data.
* **PostgreSQL with the pg driver** stores the data. The code writes plain SQL, with values passed as parameters so that nobody can sneak commands into the input.
* **bcrypt** hashes passwords with a salt, which is random extra data added before hashing.
* **`express-session` with `connect-pg-simple`** keep login sessions in a PostgreSQL table. The browser holds only a random session id in a cookie.
* **`csrf-csrf`** blocks CSRF, which is when another website secretly sends requests as you.
* **helmet** adds safe security headers to every answer.
* **`express-rate-limit`** slows down repeated login tries.
* **Jest and Supertest** run the tests. Supertest sends fake web requests to the app without opening a real port.

The reasons for these choices, and the data model, are explained in `docs/DATA_MODEL.md`.

## Security choices

* Passwords are saved only as salted bcrypt hashes. Hashes are never sent in any answer, and passwords are never logged.
* Starting passwords are random and expire after 24 hours. Until a candidate replaces theirs, the server allows only password change and sign out.
* Answers that contain starting passwords are marked `Cache-Control: no store`, so the browser does not keep them.
* Session cookies are HttpOnly, which hides them from page scripts, and SameSite, which stops other websites from sending them. They turn on the Secure setting when `NODE_ENV` is `production`. Sessions end after 2 hours without activity.
* Every request that changes data needs a CSRF token.
* Login is limited to 10 tries per 15 minutes from one address. A wrong email and a wrong password give the same answer.
* Changing or resetting a password ends the other sessions of that account.
* The server decides who you are from your session. A learner id sent in a web address or request body is never trusted. Roles and ownership are checked on the server, not only in the screens.

## The API

Every address starts with /api/v1. Success codes are shown in brackets.

* `POST /auth/login` signs in. Public and rate limited. [200]
* `POST /auth/change-password` sets a new password. Signed in users. [204]
* `POST /auth/logout` signs out. [204]
* `GET /auth/me` says who is signed in. [200]
* `GET /activities` lists activities. Coordinator only. [200]
* `POST /activities` adds an activity. Coordinator only. [201]
* `PUT /activities/{id}` edits an activity. Coordinator only. [200]
* `GET /learners` lists learners. Coordinator only. [200]
* `POST /learners` adds a candidate and returns one time credentials. Coordinator only. [201]
* `POST /learners/{id}/reset-password` makes new temporary credentials and ends old sessions. Coordinator only. [200]
* `GET /learners/{id}/assignments` shows one learner's progress. Coordinator only. [200]
* `POST /assignments` assigns an activity to a learner. Coordinator only. [201]
* `PATCH /assignments/{id}/status` updates the status of your own assignment. Candidate only. [200]
* `GET /me/assignments` shows My Training. Candidate only. [200]
* `GET /cohort-summary` shows learner, assignment and completed counts. Coordinator only. [200]

Errors come back as a short message, such as `{ "message": "Assignment already exists." }`. The codes are 400 for bad input, 401 for not signed in or wrong credentials, 403 for not allowed, 404 for not found, and 409 for a duplicate.

## Project folders

* `client` holds the React screens.
* `server` holds the API. Inside it, `src` is the app code, `db` is the table definitions and setup scripts, and `tests` is the automated tests.
* `docs` holds the demo script and the data model notes.

## Known limits

* Starting passwords are handed over by hand. Sending email is not included.
* Deleting candidates and editing their details are not included.
* Deploying is not covered. Before putting the app on a real server, serve it over HTTPS, set `NODE_ENV` to `production`, tell Express to trust your proxy, and use a strong `SESSION_SECRET`.

## If something goes wrong

* **The screens say they cannot reach the server.** The API is not running. Start it in terminal 1 and press Try again.
* **Sign in says too many attempts.** Wait 15 minutes, or stop and start the API.
* **A candidate cannot sign in.** The starting password may have expired. Use Reset password as the coordinator.
* **A script says the tables do not exist.** Run `npm run db:init` in the server folder.
* **The tests refuse to run.** Check that `TEST_DATABASE_URL` is set and that the database name contains the word test.

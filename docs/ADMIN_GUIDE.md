# Admin guide

This guide is for the person who runs the server: the **owner**. It covers everyday tasks and what to do when someone is locked out. Coordinators and candidates do not need this page.

## Two kinds of tasks

* **Inside the app.** A coordinator can do these by clicking. Example: resetting a candidate's password.
* **On the server.** Only the owner can do these, using commands or the database's own web editor. Example: recovering a coordinator.

## Using the scripts against your live database

The setup scripts read the database address from a setting called `DATABASE_URL`. To point them at the live Neon database, set it for one terminal session. The `read -s` line asks you to paste the address, and nothing appears on screen while you paste.

```
cd server
read -s DATABASE_URL
export DATABASE_URL
```

Do your task, then close the terminal, or run `unset DATABASE_URL`. A value you set this way wins over the value in `server/.env`.

Never paste the connection string into chat, a document or Git. It contains the database password.

## Create a coordinator

```
npm run coordinator:create
```

It asks for an email and a password (at least 10 characters, hidden), and asks you to type the password twice. The password is saved only as a salted hash. If the email already exists, nothing changes.

**Tip.** Create a second coordinator with a different email and keep its password somewhere safe, such as a password manager. Then a forgotten password on one account is not a crisis.

## Reset a candidate's password

This is a coordinator task, inside the app.

1. Sign in as a coordinator.
2. Open Candidates and select the person.
3. Click Reset password.
4. Give the new temporary password to the candidate privately. It is shown once and works for 24 hours.

The candidate is signed out everywhere and must choose a new password at their next login.

## Recover a coordinator who forgot their password

Nobody can read a password, because only a hash is saved. Recovery means setting a new one. Do this in three steps.

**Step 1. Remove the old account and its sessions.** Open the Neon SQL editor for your database and run this. Replace the example email with the real one.

```
DELETE FROM session
WHERE (sess->>'accountId')::int =
      (SELECT id FROM accounts WHERE LOWER(email) = LOWER('coordinator@example.com'));

DELETE FROM accounts
WHERE LOWER(email) = LOWER('coordinator@example.com') AND role = 'Coordinator';
```

This is safe for data. A coordinator has no learner profile, and no activity, assignment or candidate belongs to the coordinator account. The condition `role = 'Coordinator'` protects candidate accounts from being deleted by a typo.

**Step 2. Create the account again** with the same email and a new password, using the script above:

```
npm run coordinator:create
```

**Step 3. Sign in** on the live site with the new password.

## Check that the server is alive

Open `/api/v1/health` on the site. The answer `{"status":"ok"}` means the server is running. On the free plan, the first request after a long quiet time can take about a minute.

## Look at the logs

In Render, open the service and choose **Logs**. You will see startup messages and errors. Passwords are never written to the logs.

## Unlock a visitor who hit the login limit

The limit lasts 15 minutes. To clear it at once, restart the service in Render: **Manual Deploy**, then **Restart service**. This resets the counter. Sessions are kept.

## Change the session secret

You would do this if `SESSION_SECRET` was ever exposed.

1. Make a new one: `npm run secret` in the server folder.
2. Replace the value in Render's environment settings.
3. Restart the service.

Everyone is signed out and must sign in again. No data is lost.

## Change the database password

You would do this if the connection string was ever exposed.

1. In Neon, reset the database password and copy the new connection string.
2. Replace `DATABASE_URL` in Render's environment settings.
3. Restart the service.
4. Check `/api/v1/health` and sign in.

## Make a backup

This saves a copy of all the data into a file. It needs the PostgreSQL tools on your computer, and the tool version should match the database version or be newer.

```
pg_dump "$DATABASE_URL" > backup.sql
```

Keep the file private. It contains password hashes and personal details. Check Neon's current free plan for any built in restore options too.

## Start over with an empty database

This **erases everything**. Use it only on a new database or when you really mean it.

```
npm run db:init
```

The script asks you to type the database name before it does anything. Then create the coordinator again.

## Add fake demo data

```
npm run db:seed
```

This adds 3 made up candidates and 4 made up activities, and prints each starting password once. Use it on your own computer. It is not meant for the live site.

## Quick reference

| I want to... | Do this |
| --- | --- |
| Make the first coordinator | `npm run coordinator:create` |
| Fix a candidate who forgot a password | Reset password in the app |
| Fix a coordinator who forgot a password | The recovery steps above |
| Check the server | Open `/api/v1/health` |
| Clear the login limit | Restart the service |
| Replace an exposed secret | Make a new one, update Render, restart |
| Copy the data | `pg_dump` |
| Erase everything | `npm run db:init` (careful) |

## Where to go next

* [Deployment](DEPLOYMENT.md) for how the live site is built.
* [Security](SECURITY.md) for why recovery works this way.

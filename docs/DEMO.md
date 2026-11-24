# Demo script

This takes about 8 minutes. It follows the workflow in the project brief. Lines that start with Say are suggestions for what to explain. Lines that start with Do are what to click.

## Pick where to demo

| | On your computer | On the live site |
| --- | --- | --- |
| Speed | Always fast | Wake it up first (see below) |
| Fake data | You control it with the seed script | You create it live |
| Step 6, the expired password trick | Works | Not available, because it needs direct database access |
| Risk | Needs the two programs running | Needs internet |

Either is fine. A good plan is to use the live site, and keep the local copy running as a backup.

## Wake the live site first

The free plan puts the server to sleep after 15 minutes. About 5 minutes before you start, open https://learning-progress-tracker-q7rt.onrender.com and wait until the sign in page shows. Then it will be quick during the talk.

## Before you start

* Local demo: use a clean database. Run `npm run db:init`, then `npm run coordinator:create`, then `npm run db:seed`, all from the server folder. Keep the API and the screens running (see the main README).
* Live demo: have the coordinator email and password ready, in a password manager, not in a file on screen.
* Open the app in one browser window. Have a second, private browser window ready for the candidate, so the two sign ins do not clash.
* Keep the seed output handy if you use seeded candidates.

## The short version, 5 minutes

If you have less time, do steps 1, 3, 4 and 5, then end with one sentence from step 7.

## 1. The coordinator signs in (1 minute)

Do: Sign in as the coordinator.

Say: There is no public sign up. The first coordinator was made with a setup script, and the password is saved only as a hash. The totals at the top are counted from the saved data every time.

## 2. Activities and validation (1 minute)

Do: Open the Activities tab. Add an activity with 0 planned hours. Fix it and save. Then edit it.

Say: The server checks every field, and the database repeats the check. The screen shows an understandable message.

## 3. Create a candidate and hand over credentials (1 minute)

Do: In Candidates, click Add candidate, fill in a made up name, email and cohort, and click Create account.

Say: The username and starting password appear once, in a panel, for private handover. They are not stored in readable form anywhere. The password expires in 24 hours.

Do: Add the same email again, in capital letters.

Say: Email uniqueness ignores letter case, and the message appears right under the email box.

## 4. First login and password change (1 minute)

Do: In the private window, sign in as the new candidate with the starting password.

Say: The candidate lands on the password change screen. The server allows nothing else until it is done, so this is not only a screen rule.

Do: Choose a new password.

## 5. Assign training and update progress (2 minutes)

Do: In the coordinator window, select the candidate and assign an activity. Watch the totals change.

Do: In the candidate window, open My Training. Before anything is assigned, it shows "No training assigned yet." After the assignment, change the status and click Save. Refresh the page.

Say: Status changes use a select and show a clear Saved message. After a refresh the change is still there, because it is saved in the database.

Do: Back in the coordinator window, open the candidate. The progress bar and the totals match.

## 6. Show that the rules are enforced (2 minutes)

Do: Sign in as a different candidate. Make a new starting password first with Reset password in the coordinator window. Complete their password change.

Do: In the browser developer console of that candidate window, run this to try to read every learner:

```
fetch('/api/v1/learners').then(r => r.status)
```

Say: It prints 403. A candidate cannot list learners or create accounts.

Do: Run this to try to change another candidate's assignment. Use the id of an assignment that belongs to someone else:

```
const t = (await (await fetch('/api/v1/auth/csrf-token')).json()).csrfToken;
fetch('/api/v1/assignments/1/status', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'x-csrf-token': t },
  body: JSON.stringify({ status: 'Completed' }),
}).then(r => r.status)
```

Say: It prints 403. The server checks that the assignment belongs to the signed in candidate. A learner id in a web address or request body is never trusted.

Do: Optional, on your computer only. Show an expired credential. In a terminal, run this, then try signing in with the starting password:

```
psql lpt -c "UPDATE accounts SET temp_password_expires_at = NOW() - INTERVAL '1 hour' WHERE email = 'meera.iyer@example.com';"
```

Say: Sign in is refused with the same generic message. The coordinator fixes it with Reset password, which also ends any old sessions and starts first login again.

## 7. Finish with the tests and the design (1 minute)

Do: Run `npm test` in the server folder, or show a recent passing run.

Say: The tests cover required fields, duplicate emails and assignments, expired credentials, the first login lock, sign out and session expiry, coordinator only actions, and cross candidate access. Unit tests mock the database and the password tool. The main workflow has its own end to end test.

Say: The data model has four tables plus a session table. See [Data model](DATA_MODEL.md) for the picture and the reasons for the stack.

## A simple story for the opening

Say: "Training managers often track progress in spreadsheets. I built a small web app where a coordinator assigns training and each candidate updates only their own progress. The part I focused on most is safety: hashed passwords, forced first login password change, and rules that the server enforces, not only the screens."

## Questions you may be asked

* **Why not store the cohort totals?** They are counted from the saved rows, so they can never be out of date.
* **Why plain SQL?** The rules are database rules, and plain SQL keeps them visible.
* **How do you know a candidate cannot see another candidate's data?** Identity comes from the session, ownership is checked on the server, and a test tries it.
* **How are passwords stored?** Only as salted bcrypt hashes, so nobody can read them, not even the owner.
* **What if a coordinator forgets their password?** The server owner sets a new one in the database. See the [Admin guide](ADMIN_GUIDE.md).
* **Why does the live site start slowly?** It runs on a free plan that sleeps when idle. It is free by design.
* **What would you add next?** Email delivery of credentials, a forgot password link, and CSV import and export for activities.

More questions and answers are in the [FAQ](FAQ.md).

## If something goes wrong during the demo

| Problem | Quick fix |
| --- | --- |
| The live site is slow or blank | It was asleep. Wait a minute and refresh |
| The screens cannot reach the server (local) | The API is not running. Start it and press Try again |
| Sign in says too many attempts | Wait, or restart the server. Use the other copy of the demo |
| A candidate cannot sign in | The temporary password expired. Use Reset password |

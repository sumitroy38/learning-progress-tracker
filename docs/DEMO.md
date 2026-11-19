# Demo script

This takes about 8 minutes. It follows the workflow in the project brief. Lines that start with Say are suggestions for what to explain. Lines that start with Do are what to click.

## Before you start

* Use a clean database: `npm run db:init`, then `npm run coordinator:create`, then `npm run db:seed`, all from the server folder.
* Keep the API and the screens running (see the main README).
* Open the app in one browser window. Keep the seed output handy.
* Have a second, private browser window ready for the candidate, so the two sign ins do not clash.

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

Do: Sign in as a different candidate, for example one of the seeded ones. Make a new starting password first with Reset password in the coordinator window. Complete their password change.

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

Do: Optional. Show an expired credential. In a terminal, run this, then try signing in with the starting password:

```
psql lpt -c "UPDATE accounts SET temp_password_expires_at = NOW() - INTERVAL '1 hour' WHERE email = 'meera.iyer@example.com';"
```

Say: Sign in is refused with the same generic message. The coordinator fixes it with Reset password, which also ends any old sessions and starts first login again.

## 7. Finish with the tests and the design (1 minute)

Do: Run `npm test` in the server folder, or show a recent passing run.

Say: The tests cover required fields, duplicate emails and assignments, expired credentials, the first login lock, sign out and session expiry, coordinator only actions, and cross candidate access. Unit tests mock the database and the password tool. The main workflow has its own end to end test.

Say: The data model has four tables plus a session table. See `docs/DATA_MODEL.md` for the picture and the reasons for the stack.

## Questions you may be asked

* **Why not store the cohort totals?** They are counted from the saved rows, so they can never be out of date.
* **Why plain SQL?** The rules are database rules, and plain SQL keeps them visible.
* **How do you know a candidate cannot see another candidate's data?** Identity comes from the session, ownership is checked on the server, and a test tries it.
* **What would you add next?** Email delivery of credentials, deployment behind HTTPS, and CSV import and export for activities.

# Frequently asked questions

Short answers to the questions people ask most. Each answer points to a longer page when there is one.

## About the project

### What is this project?
A website where a coordinator assigns learning activities to candidates, and candidates mark their own progress. See the [Overview](OVERVIEW.md).

### Is it free to use?
Yes. The code is open on GitHub, and the live site runs on free plans, so it costs nothing to run. See [Deployment](DEPLOYMENT.md).

### Is the data real?
No. Every name, email and activity in the project is made up. Do not enter real personal data into the live demo.

### Which technologies does it use?
React, Vite and Tailwind CSS for the screens. Node.js and Express for the server. PostgreSQL for the data. bcrypt for passwords. Jest and Supertest for tests. Render and Neon for free hosting. See [Architecture](ARCHITECTURE.md).

### Why were these tools chosen?
They match the JavaScript full stack track, they are widely used, and each one has one clear job. Plain SQL was chosen over an ORM so every data rule stays visible and easy to explain. See [Architecture](ARCHITECTURE.md) and [Data model](DATA_MODEL.md).

## Using the live site

### Why does the site take about a minute to open?
It runs on a free plan, and the server goes to sleep after 15 minutes without visitors. The first visit wakes it up. After that it is fast.

### Can I sign up myself?
No. There is no public sign up on purpose. A coordinator creates candidate accounts, and the owner of the server creates coordinator accounts.

### How can I try the live site?
Coordinator accounts are private. You can run the project on your own computer with fake data in about 10 minutes (see the main README), or ask the owner for a guided demo.

### Why am I asked to change my password the first time?
The password you were given is temporary and was seen by the coordinator. You choose a new one that only you know. Nothing else in the app works until you do.

### My temporary password does not work.
It may have expired. Temporary passwords last 24 hours. Ask your coordinator to use Reset password to make a new one.

### I forgot my password. What now?
* **Candidate.** Ask your coordinator to use Reset password.
* **Coordinator.** Ask the owner of the server to recover the account. See the [Admin guide](ADMIN_GUIDE.md).

### Why can nobody tell me my old password?
Passwords are stored only as hashes, which are scrambled one way copies. They cannot be turned back. A site that can show your old password stores it unsafely.

### It says "Too many login attempts".
Each visitor gets 10 tries per 15 minutes. Wait 15 minutes and try again. If you do not know your password, ask for a reset instead of guessing.

### I was signed out by itself.
Sessions end after 2 hours without activity. Sign in again.

### Why can I not see other candidates?
Candidates can only see and change their own training. This is enforced by the server.

### Can a coordinator change a candidate's status?
No. Only the candidate can update their own status. The coordinator can see it.

### Can I change a status back, for example from Completed to In Progress?
Yes. A candidate can choose any of the three statuses at any time.

### Can I delete a candidate or an activity?
Not in the app. This was left out to keep the project focused. The database is protected, so an activity that is still assigned cannot be removed by accident.

### Does it work on a phone?
Yes. The screens adapt to small widths.

## Safety and privacy

### How are passwords stored?
Only as salted bcrypt hashes. Nobody, including the owner of the server, can read them. See [Security](SECURITY.md).

### Can a candidate open another candidate's data by changing a number in the address?
No. The server finds who you are from your session, never from an id you send, and it checks ownership on every change. A test tries exactly this attack.

### What is a CSRF token and why does it matter?
It is a one time proof that a request came from our own screens and not from another website pretending to be you. Every change needs one.

### Is the connection secure?
On the live site, yes. It uses HTTPS, and cookies are marked Secure so they travel only over HTTPS.

### Has it been security audited?
No. It follows good practice and has tests, but it is a training project and has not had a professional audit.

## Technical questions

### Why PostgreSQL and not a simpler file or MongoDB?
The data is relational: accounts, learners, activities and assignments point to each other. PostgreSQL enforces those links with foreign keys and rules, which protects the data.

### Why store sessions in the database?
So a server restart does not sign everyone out, and so a password reset can really end a session.

### Why cookies and not tokens kept in the page?
An HttpOnly cookie cannot be read by page scripts, so a script injected into the page cannot steal it.

### Why does the server serve the React screens as well?
One address and one HTTPS site is simpler and works on a free plan. On your own computer, Vite serves the screens and passes `/api` calls to the server.

### Why are the tests slow?
Passwords are hashed with a deliberately slow method, and the tests create many accounts. A full run takes about 1 to 2 minutes.

### What happens when the database goes to sleep?
The free database pauses when idle. The first request afterwards is a bit slower. The server survives a closed idle connection and opens a new one when needed.

### What Node.js version do I need?
Version 22 or newer. The live site uses 24.

### How do I add a feature?
Follow the short recipe at the end of [Architecture](ARCHITECTURE.md).

### How do I run the tests?
`npm run db:init:test`, then `npm test`, both inside the `server` folder. See [Testing](TESTING.md).

### Where can I see every API address?
In the [API reference](API.md).

### How do I update the live site?
Push to the `main` branch on GitHub. Render builds and publishes by itself. See [Deployment](DEPLOYMENT.md).

### Can I use my own domain name?
Yes, Render supports custom domains. Check the current cost first, because free plans may limit them.

## Ideas for the future

* Send temporary passwords by email, and add a "Forgot password" link
* Delete and edit candidates
* Two step login
* A history of who changed what
* CSV import and export for activities
* Browser tests for the screens

## Still stuck?

Check the troubleshooting tables in the main README and in [Deployment](DEPLOYMENT.md). Then open an issue on the GitHub repository and describe what you did and what you saw. Please do not paste passwords or connection strings.

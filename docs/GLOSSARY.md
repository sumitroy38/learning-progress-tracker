# Glossary

Plain English meanings of the words used in this project, in alphabetical order.

| Word | Meaning |
| --- | --- |
| **Activity** | A piece of training that can be assigned, such as "SQL Fundamentals". It has a title, a topic and planned hours |
| **API** | Application Programming Interface. A set of web addresses that a program can call to read and save data |
| **Assignment** | An activity given to one learner. It carries that learner's progress status |
| **bcrypt** | A tool that turns a password into a hash. It is slow on purpose, which makes guessing expensive |
| **Build** | Turning the source code of the screens into the final files that browsers load |
| **Candidate** | A person being trained. In this project, candidate and learner mean the same person |
| **CHECK rule** | A rule in the database that refuses bad values, such as negative hours |
| **Cohort** | A group of candidates trained together, such as "Cohort A" |
| **Connection string** | One long address that tells a program how to reach a database, including the password |
| **Cookie** | A small piece of data the browser keeps and sends back to the server. Ours holds a random session id |
| **Coordinator** | The person in charge of the training. They manage activities, candidates and assignments |
| **CSRF** | Cross Site Request Forgery. An attack where another website secretly sends requests as you. A token stops it |
| **Deploy** | Put the app on the internet so others can use it |
| **Environment variable** | A named setting kept outside the code, such as `DATABASE_URL` |
| **Express** | A Node.js library for building web servers and APIs |
| **Foreign key** | A database rule that a reference must point to something real, such as an assignment pointing to an existing learner |
| **Hash** | A scrambled one way copy of a password. It cannot be turned back into the password |
| **Helmet** | A library that adds safe security headers to every answer |
| **HTTP method** | The action of a request. GET reads, POST creates, PUT replaces, PATCH changes part of something |
| **HTTPS** | The secure version of web traffic. It hides what is sent from anyone listening |
| **HttpOnly** | A cookie setting that stops page scripts from reading the cookie |
| **Jest** | The tool that runs our automated tests |
| **JSON** | A simple text format for data, such as `{ "status": "Completed" }` |
| **Learner** | A candidate's training profile: a name and a cohort |
| **Middleware** | A step that every request passes through before reaching the real code |
| **Mock** | A fake stand in used in a test, for example a fake database |
| **Neon** | The free service that hosts our PostgreSQL database |
| **Node.js** | A program that runs JavaScript outside the browser. The server runs on it |
| **npm** | The tool that downloads code libraries (packages). It comes with Node.js |
| **Package** | A ready made code library downloaded with npm |
| **Pool** | A set of reusable database connections, so each request does not open a new one |
| **PostgreSQL** | The database that stores all the data |
| **Proxy** | A helper server between the visitor and the app. Hosting platforms use them |
| **Rate limit** | A cap on how many tries someone gets in a time window |
| **React** | A library for building screens from small reusable parts |
| **Render** | The free service that runs our server on the internet |
| **REST** | A style of API where each address names a thing and the method names the action |
| **Salt** | Random extra data mixed into a password before hashing, so equal passwords get different hashes |
| **SameSite** | A cookie setting that stops other websites from sending the cookie |
| **Secure cookie** | A cookie that the browser sends only over HTTPS |
| **Session** | The server's memory that you are signed in. The browser keeps only its id |
| **SQL** | The language used to ask a database for data or to change it |
| **SQL injection** | An attack that sneaks commands into a database query through input. Using parameters stops it |
| **Supertest** | A tool that sends fake web requests to the app inside tests |
| **Tailwind CSS** | A styling tool that uses small ready made classes written next to the markup |
| **Temporary password** | A random starting password that works for 24 hours and must be changed at first login |
| **Token** | A random value used as proof. Our CSRF token proves a request came from our own screens |
| **Unique index** | A database rule that no two rows may share the same value, such as an email |
| **Vite** | The tool that runs the screens while developing and builds them for release |

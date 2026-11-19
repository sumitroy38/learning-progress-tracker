# Client

The web screens for the Learning Progress Tracker. Built with React and Vite.

Vite is the tool that runs the app while you work and builds it for release.

## Run it

The API must already be running on port 4000. See the main README for the full setup.

```
npm install
npm run dev
```

Then open http://localhost:5173/

While you work, Vite passes every call that starts with /api on to the API at port 4000. Because the browser sees only one address, the login cookies just work and no extra cross site settings are needed.

## Other commands

* `npm run lint` checks the code for common mistakes
* `npm run build` makes the release files in the dist folder

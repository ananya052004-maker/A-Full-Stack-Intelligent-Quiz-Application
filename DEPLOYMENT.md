# Deploying Quorum (frontend + backend + database)

Your app has **three** deployable pieces. The frontend is already on **Vercel**; you now need a **database** and a **backend** in the cloud, then wire them together.

```
  Vercel (frontend)  ──HTTPS──▶  Render (Express backend)  ──▶  Neon (PostgreSQL)
  REACT_APP_API_URL              DATABASE_URL
```

Recommended free-tier stack: **Neon** (Postgres) + **Render** (backend) + **Vercel** (frontend, already set up). Everything below has a free tier.

---

## Step 1 — Database on Neon (PostgreSQL)

1. Go to **https://neon.tech** → sign up → **Create a project** (name it `quorum`).
2. Neon shows a **connection string** like:
   `postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require`
   **Copy it** — this is your `DATABASE_URL`.
3. Load the schema and seed data. On your Mac, from the project root:
   ```bash
   PSQL=/opt/homebrew/opt/postgresql@16/bin/psql
   $PSQL "PASTE_YOUR_NEON_CONNECTION_STRING" -f backend/schema.pg.sql
   $PSQL "PASTE_YOUR_NEON_CONNECTION_STRING" -f backend/seed_questions.pg.sql
   ```
   This creates all 17 tables and loads your 80 questions into the cloud DB.

> You can re-run these any time to reset the cloud DB.

---

## Step 2 — Backend on Render

1. Go to **https://render.com** → sign up with GitHub → **New → Web Service**.
2. Connect your repo **A-Full-Stack-Intelligent-Quiz-Application**.
3. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Add **Environment Variables** (Render → your service → Environment):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(your Neon connection string from Step 1)* |
   | `PGSSL` | `true` |
   | `SESSION_SECRET` | *(a long random string)* |
   | `JWT_SECRET` | *(a long random string)* |
   | `GOOGLE_CLIENT_ID` | *(from Google Cloud — see Step 4)* |
   | `GOOGLE_CLIENT_SECRET` | *(from Google Cloud — freshly rotated)* |
   | `FRONTEND_URL` | `https://quiz-app-frontend-pearl.vercel.app` |
   | `GOOGLE_CALLBACK_URL` | `https://YOUR-RENDER-URL.onrender.com/api/auth/google/callback` |

   *(You won't know your Render URL until the service is created — deploy once, copy the `https://…onrender.com` URL Render gives you, then fill in `GOOGLE_CALLBACK_URL` and redeploy.)*
5. **Deploy.** When it's live, open `https://YOUR-RENDER-URL.onrender.com/` — you should see **"Quiz App Backend is running 🚀"**.

> **Note:** Render's free tier **sleeps after 15 min of inactivity**; the first request after that takes ~30–50s to wake. Fine for a demo.

---

## Step 3 — Point the frontend at the backend (Vercel)

1. Vercel dashboard → your project → **Settings → Environment Variables**.
2. Add:
   | Key | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://YOUR-RENDER-URL.onrender.com/api` |
3. **Redeploy** the frontend (Deployments → ⋯ → Redeploy) so the new env var is baked into the build.

*(Locally, nothing changes — without this var the app falls back to `http://localhost:5000/api`.)*

---

## Step 4 — Update Google OAuth for production

Google only allows sign-in from URLs you've whitelisted.

1. **https://console.cloud.google.com** → **APIs & Services → Credentials** → your OAuth 2.0 Client.
2. **Authorized JavaScript origins** — add:
   - `https://quiz-app-frontend-pearl.vercel.app`
   - `https://YOUR-RENDER-URL.onrender.com`
3. **Authorized redirect URIs** — add:
   - `https://YOUR-RENDER-URL.onrender.com/api/auth/google/callback`
4. **Save.** (Changes can take a few minutes to take effect.)
5. **Rotate the client secret** here if you haven't already (it was exposed in git history earlier) and update `GOOGLE_CLIENT_SECRET` on Render.

---

## Step 5 — Verify

1. Open your Vercel URL.
2. **Public features work immediately** (no login): create a Poll/Word Cloud/Survey/Q&A, take a quiz, view the leaderboard. These only need the backend + DB.
3. **Teacher login:** click Sign In → Google → pick Teacher → build a quiz.

---

## Known caveats (good to understand, and to mention in interviews)

- **Cross-site cookies for login:** the frontend (vercel.app) and backend (onrender.com) are different domains, so the login session relies on a `SameSite=None; Secure` cookie. The code sets this in production (`NODE_ENV=production`). Some browsers with strict third-party-cookie blocking may interfere with *login* — but **all the public features work regardless**, since they don't use cookies. A fully robust fix is JWT-in-header auth or serving both under one domain.
- **Free-tier cold starts:** Render sleeps; the first request wakes it (~30–50s).
- **Env vars are baked in at build time** for the React app — after changing `REACT_APP_API_URL`, you must redeploy the frontend.

---

## Quick reference — all environment variables

**Backend (Render):** `NODE_ENV`, `DATABASE_URL`, `PGSSL`, `SESSION_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`, `GOOGLE_CALLBACK_URL` *(Render sets `PORT` automatically)*

**Frontend (Vercel):** `REACT_APP_API_URL`

**Local dev:** no env vars needed — frontend falls back to `http://localhost:5000/api`, backend falls back to local Postgres via `backend/.env`.

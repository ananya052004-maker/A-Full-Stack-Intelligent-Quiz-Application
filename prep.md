# Quorum — Interview Prep & Architecture Guide

A complete reference for talking about this project in an SDE interview. It covers what the project is, how every piece works, the key engineering decisions and trade-offs, and a bank of likely questions with model answers.

> **One-line pitch:** *Quorum is a full-stack, Mentimeter-style interactive classroom platform — a React + Node/Express + PostgreSQL app where a teacher builds quizzes from a managed question bank and runs live audience-participation activities (polls, word clouds, surveys, Q&A, and host-controlled presentations), with role-based access and a per-quiz leaderboard.*

---

## 1. The 60-second elevator pitch

"I took a basic solo quiz app and turned it into a live, multi-user engagement platform called **Quorum**. It has two sides: a **teacher side** where you manage a question bank and assemble quizzes, and an **audience side** where students or guests join by link to take quizzes or participate in live activities — polls, word clouds, surveys, Q&A, and combined presentations. It's built with **React and Tailwind** on the front end, **Node/Express with Passport (Google OAuth)** on the back end, and **PostgreSQL** for storage. The interesting engineering is in the **role-based access control**, the **server-side quiz scoring** so students can't see answers, a **polymorphic 'slide' model** with a strategy-pattern renderer for the presentation feature, and a **database-adapter layer** I wrote when I migrated the whole thing from MySQL to PostgreSQL without rewriting all the route code."

---

## 2. Tech stack (and *why* each choice)

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | **React 19** (Create React App) | Component model fits the many small interactive views; already the project's base. |
| Routing | **react-router-dom v7** | Client-side routing for the SPA; nested/param routes for `/take/:id`, `/features/poll/:id`, etc. |
| Styling | **Tailwind CSS v3** | Utility-first, consistent design system, fast iteration, one shared theme (`tailwind.config.js`). |
| State sharing | **React Context API** (`AuthContext`) | Global auth/role state without a heavier library like Redux — the app's shared state is small. |
| HTTP | **axios** | Promises, interceptors-ready, `withCredentials` for session cookies. |
| Backend runtime | **Node.js + Express 5** | Lightweight REST API; matches the existing stack. |
| Auth | **Passport + passport-google-oauth20 + express-session** | Delegated identity (Google), session-cookie auth. |
| Database | **PostgreSQL 16** (migrated from MySQL 8) | Relational data with strong constraints (FKs, UNIQUE), JSONB for flexible fields, and a more standards-compliant SQL engine. |
| DB driver | **pg** (node-postgres) with connection pooling | Pooled connections, parameterized queries. |

**Why a relational DB and not NoSQL?** The data is highly relational — users → quizzes → quiz_questions → questions, and quiz_attempts for the leaderboard. I rely on foreign keys with `ON DELETE CASCADE`, `UNIQUE` constraints for one-vote-per-person, and aggregate queries (`GROUP BY`, `COUNT`, `MAX`) for tallies and leaderboards. That's exactly relational-database territory. JSONB covers the few flexible fields (quiz options, slide config) so I still get schema flexibility where I want it.

---

## 3. High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      React SPA (localhost:3000)               │
│                                                               │
│  AuthContext ──> /api/auth/user  (session cookie, role)       │
│                                                               │
│  Public pages         Teacher pages          Live features    │
│  Home / Quizzes hub   Dashboard              Poll / WordCloud  │
│  Take quiz            Question Bank          Survey / Q&A      │
│  Leaderboard          Quiz Builder           Presentations    │
│        │                    │                      │          │
└────────┼────────────────────┼──────────────────────┼──────────┘
         │  axios (REST + withCredentials)            │  2s polling
         ▼                                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Express API server (localhost:5000)              │
│                                                               │
│  Passport (Google OAuth) + express-session                    │
│  requireTeacher middleware (role gate)                        │
│                                                               │
│  Routes: /auth  /questions  /teacher  /quizzes  /polls        │
│          /qna  /surveys  /wordclouds  /presentations          │
│                     │                                         │
│         db.js  ── mysql2-compatible shim over `pg` ──         │
└─────────────────────┼────────────────────────────────────────┘
                      ▼
              ┌───────────────┐
              │  PostgreSQL   │  17 tables
              │    quizdb     │  users, questions, quizzes,
              └───────────────┘  quiz_questions, quiz_attempts,
                                 polls, poll_votes, qna_*, surveys,
                                 survey_responses, wordclouds,
                                 wordcloud_entries, presentations,
                                 presentation_slides, scores
```

**Request lifecycle example (student takes a quiz):**
1. Student opens `/take/42` (React route).
2. `GET /api/quizzes/42` → server returns questions **without** `correctAnswer`.
3. Student answers; `POST /api/quizzes/42/submit` with `{ answers, name }`.
4. Server loads the correct answers, **scores server-side**, inserts a `quiz_attempts` row, computes the rank, returns `{ score, total, rank, players, results }`.
5. React shows the score, the leaderboard (`GET /api/quizzes/42/leaderboard`), and per-question review.

---

## 4. Feature-by-feature walkthrough

### 4.1 Role-based access (Teacher / Student / Guest)
- **Login:** Google OAuth via Passport. On first login the user has no role, so the frontend shows a **role picker** (`ChooseRole`) that calls `POST /api/auth/role`.
- **Guest:** never logs in — can still take any quiz by link and join live activities.
- **Enforcement is two-layered:**
  - **Frontend:** `AuthContext` exposes `isTeacher`; a `RequireTeacher` wrapper guards `/teacher/*` routes.
  - **Backend (the real gate):** a `requireTeacher` middleware on the `/api/teacher` router checks `req.isAuthenticated() && req.user.role === 'teacher'`, returning **403** otherwise. Never trust the client — the server is authoritative.

### 4.2 Question bank (teacher only)
- CRUD over the `questions` table, filtered by topic/category.
- `GET /api/teacher/categories`, `GET /api/teacher/questions?category=…`, `POST/PUT/DELETE /api/teacher/questions`.
- Each question: text, options (JSONB array), `correctanswer`, category. A shared `QuestionForm` component with a radio to mark the correct option; validation ensures the correct answer is one of the options.

### 4.3 Quiz builder → shareable quiz (teacher only)
- Teacher picks a topic, **checkboxes** the questions to include, names the quiz.
- `POST /api/teacher/quizzes` creates a `quizzes` row + a `quiz_questions` join row per selected question (with `position` to preserve order).
- Result: a shareable link `/take/:id`. Quizzes also appear on the public **Quizzes hub** (`/quizzes`).

### 4.4 Taking a quiz + leaderboard (public)
- **Security-critical:** `GET /api/quizzes/:id` returns questions with **no correct answers**. Scoring happens on `POST /api/quizzes/:id/submit`.
- Each submission is saved to `quiz_attempts (quiz_id, name, score, total)`.
- **Rank** = `1 + (number of distinct names with a strictly higher best score)`.
- **Leaderboard** = best score per name, ranked: `GROUP BY name, MAX(score) ORDER BY score DESC`.
- Taker identity: logged-in name, or a name entered at a gate (stored in `localStorage`).

### 4.5 Live features (Poll, Word Cloud, Survey, Q&A)
All follow the same pattern: **create → share link → participate → live results**.

- **Poll:** fixed options; one vote per browser (enforced by a `localStorage` UUID token **and** a `UNIQUE(poll_id, voter_token)` constraint → duplicate returns **409**). Results as animated percentage bars.
- **Word Cloud:** open text; backend aggregates word frequency (lowercased), and the frontend scales each word's font size by frequency. Per-person word limit enforced server-side.
- **Survey:** two modes — **rating** (1–5 → average + histogram) or **open text** (→ live feed). Anonymous; one response per person.
- **Q&A:** participants submit questions and **upvote** (toggle, one per person); list auto-sorts by votes. The board **owner** can mark questions answered (owner-only, enforced server-side → 403 for others).

### 4.6 Presentations (ties everything together)
- A presentation is an **ordered deck of slides**; each slide is `info`, `poll`, `word_cloud`, or `survey`.
- The builder creates the underlying poll/survey/word-cloud record and stores a `presentation_slides` row referencing it (`ref_id`) plus a `position`.
- **Presenter mode:** the owner clicks Next/Prev, which persists `current_index` on the `presentations` row.
- **Participant view:** polls the server; when `current_index` changes, everyone's screen advances to the same slide — "one deck, every screen in sync."

---

## 5. Database schema (17 tables)

**Core / identity**
- `users(id, name, email UNIQUE, role)` — role ∈ {teacher, student} or NULL.
- `questions(id, question, options JSONB, correctanswer, category)`
- `scores(id, user_id, category, score, time_taken)` — legacy practice scores.

**Quizzes**
- `quizzes(id, title, category, created_by → users, created_at)`
- `quiz_questions(id, quiz_id → quizzes, question_id → questions, position, UNIQUE(quiz_id, question_id))`
- `quiz_attempts(id, quiz_id → quizzes, name, score, total, created_at)` — powers the leaderboard.

**Live features**
- `polls(id, question, options JSONB, created_at)` / `poll_votes(id, poll_id, option_index, voter_token, UNIQUE(poll_id, voter_token))`
- `qna_boards(id, title, owner_token, …)` / `qna_questions(id, board_id, text, author_token, answered)` / `qna_upvotes(id, question_id, voter_token, UNIQUE(question_id, voter_token))`
- `surveys(id, question, mode, scale)` / `survey_responses(id, survey_id, rating, text_answer, responder_token, UNIQUE(survey_id, responder_token))`
- `wordclouds(id, prompt, max_words)` / `wordcloud_entries(id, wordcloud_id, word, submitter_token)`
- `presentations(id, title, owner_token, current_index)` / `presentation_slides(id, presentation_id, position, type, ref_id, config JSONB)`

**Relationships:** all child tables use `FOREIGN KEY … ON DELETE CASCADE`, so deleting a quiz/board/presentation cleans up its rows automatically. `UNIQUE` constraints enforce one-vote/one-response per person at the database level (defense in depth beyond the client check).

Full DDL lives in [`backend/schema.pg.sql`](backend/schema.pg.sql).

---

## 6. Key design patterns & decisions (great talking points)

### 6.1 Polymorphic content model + Strategy pattern (the strongest one)
Instead of five parallel systems for the different activity types, presentations model everything as a **`Slide`** with a `type` field and a JSON `config`. On the frontend, a single **`SlideRenderer`** maps `type → component` — the **strategy pattern**:

```
switch (slide.type) {
  case 'info':       return <InfoSlide … />
  case 'poll':       return <PollView embedId={slide.refId} embedded />
  case 'word_cloud': return <WordCloudView embedId={slide.refId} embedded />
  case 'survey':     return <SurveyView embedId={slide.refId} embedded />
}
```
Adding a 6th activity type = one new enum value + one renderer case, not a new subsystem. The activity components were made **embeddable** (`embedId` / `embedded` props) so they're reused verbatim inside presentations — no duplicated code.

### 6.2 Database adapter/shim (Adapter pattern) — the migration story
When I migrated MySQL → PostgreSQL, rewriting every query in ~10 route files was risky. Instead I wrote **`db.js` as an adapter** that keeps the old `mysql2` call style working on top of `pg`:
- Converts `?` placeholders → `$1, $2, …`
- Auto-appends `RETURNING id` to `INSERT`s so callers can still read `result.insertId`
- Maps PostgreSQL error codes back to the MySQL codes the routes check (`23505 → ER_DUP_ENTRY`, `23503 → ER_NO_REFERENCED_ROW_2`)
- Registers a type parser so `COUNT()` (BIGINT) returns a JS **number**, not a string
- Returns rows as an array that *also* carries `.insertId`/`.affectedRows`

This is a textbook **adapter**: it makes an incompatible interface (`pg`) look like the one the code already expects (`mysql2`), so the blast radius of the migration was ~5 small edits instead of a full rewrite.

### 6.3 Anonymous-but-abuse-resistant participation
Guests don't have accounts, but I still need "one vote per person." Solution: a **session-scoped UUID token** generated with `crypto.randomUUID()` and stored in `localStorage`, sent with each submission. It's backed by a **`UNIQUE` constraint** in the DB so even a crafted request can't double-vote. Identity without accounts, enforced at the data layer.

### 6.4 Server-authoritative scoring
The client never receives correct answers for a quiz. `GET /quizzes/:id` omits them; `POST /submit` scores on the server and only *then* reveals correct answers in the results. This prevents cheating via DevTools/network inspection — a real security decision, not just a feature.

### 6.5 Single source of truth for features
A `features.js` config array drives the navbar, the footer, and the feature landing pages, each with a `ready` flag. Flip one flag to launch/retire a feature — no scattered edits.

---

## 7. Authentication & authorization

- **Authentication (who you are):** Google OAuth via Passport. `serializeUser` stores the user id in the session; `deserializeUser` reloads the full user (including role) from the DB on each request. Session stored in a cookie (`express-session`), sent cross-origin with `credentials: true` (CORS) + `withCredentials` (axios).
- **Authorization (what you can do):** role-based. `requireTeacher` middleware gates all `/api/teacher/*` endpoints. Owner-only actions (e.g., marking a Q&A answered, advancing a presentation) verify an owner token server-side.
- **Guests:** unauthenticated, but can still take quizzes and join activities.

---

## 8. Real-time strategy — honest and important

The live features **currently use short-interval polling**: components call `setInterval(fetchState, 2000)`, so results refresh every ~2 seconds. This is simple, stateless, works across page reloads, and is perfectly good for a classroom demo.

**Be ready to discuss the upgrade path** (shows you understand the trade-off):
- The natural next step is **WebSockets (Socket.io)** with rooms keyed by a session/join code, pushing updates instantly instead of every 2s.
- Ephemeral live state (active slide, running tallies, presence) would live **in memory per room**, behind an interface so it can be swapped for **Redis pub/sub** when scaling to multiple server instances (a participant's socket might connect to a different instance than the host, so shared state via Redis is required).
- **Trade-off:** polling is simpler and stateless but wastes requests and has up-to-2s latency; WebSockets are instant and efficient but stateful, harder to scale horizontally, and need reconnection handling.

---

## 9. The MySQL → PostgreSQL migration (deep-dive story)

A concrete, memorable engineering narrative. The gotchas I had to solve:

| Difference | MySQL | PostgreSQL | How I handled it |
|---|---|---|---|
| Placeholders | `?` | `$1, $2` | `toPg()` converts in the adapter |
| Auto-increment id | `result.insertId` | `RETURNING id` | Adapter appends `RETURNING id`, exposes `.insertId` |
| Bulk insert | `VALUES ?` | not supported | Rewrote 2 spots to build `($1,$2),($3,$4)…` |
| Identifier case | case-insensitive | folds unquoted to lowercase | `correctAnswer` became `correctanswer`; aliased on read: `correctanswer AS "correctAnswer"` |
| `CHAR(n)` | trims trailing spaces on read | **blank-pads** to n | Switched token columns to `VARCHAR(36)` (padding broke token equality) |
| `GROUP BY` | lax | strict (must list non-aggregated cols) | Added missing columns to `GROUP BY` |
| `COUNT()` type | number | BIGINT → **string** in node-pg | Registered a type parser to return numbers |
| Error codes | `ER_DUP_ENTRY` | `23505` | Adapter maps codes back |
| JSON | `JSON` | `JSONB` | Direct swap; node-pg parses JSONB automatically |
| ENUM | native `ENUM` | `TEXT CHECK (… IN …)` | Converted in schema |
| Auto-start id | `AUTO_INCREMENT` | `SERIAL` | Converted in schema |

I also wrote a one-off **migration script** (mysql2 → pg) to copy the users and 80 questions across, and made `db.js` read a `DATABASE_URL` env var so it can point at a hosted/cloud Postgres (Neon/Supabase/Render) with zero code changes for deployment.

---

## 10. Security considerations (what I got right, and lessons)

- **Server-side scoring**; correct answers never sent to takers.
- **Role gating** on the server, not just hidden UI.
- **Parameterized queries** everywhere → no SQL injection.
- **DB-level uniqueness** for one-vote-per-person (not just client checks).
- **Input validation** on create endpoints (option counts, correct-answer membership, rating range, word length/limits).
- **Lesson learned (be honest if asked):** early on, `.env` (with the Google OAuth secret) and `node_modules` were committed to git. I fixed it by adding a `.gitignore`, untracking them (`git rm --cached`), and — importantly — **rotating the exposed secret**, since removing a file from the latest commit doesn't scrub it from git history. Good example of understanding that *secrets in history stay leaked until rotated*.

---

## 11. Trade-offs, limitations & "what I'd improve"

Interviewers love this section. Be proactive about it.

- **Polling vs WebSockets:** chose polling for simplicity; would move to Socket.io + Redis for true real-time at scale (see §8).
- **In-memory sessions:** `express-session` uses the default in-memory store — fine for one instance, but I'd move to a Redis/Postgres session store for horizontal scaling and restart-safety.
- **The db.js adapter is pragmatic, not permanent:** it minimized migration risk, but a cleaner long-term design is a thin query layer or a query builder (Knex) / ORM (Prisma) with typed models.
- **No automated tests yet:** I'd add Jest + Supertest for the API (scoring logic, role gating, one-vote enforcement) and React Testing Library for components. The scoring and rank logic are the highest-value units to test.
- **Role is permanent once chosen:** no self-serve switch or admin panel; I'd add an admin role and role management.
- **Rate limiting:** I'd add `express-rate-limit` on submission endpoints to harden anonymous participation.
- **Pagination:** question bank and leaderboards return capped/full lists; large datasets need pagination.
- **Observability:** structured logging + error monitoring (e.g., Sentry) for production.

---

## 12. Anticipated interview questions + model answers

### Project / behavioral
**Q: Walk me through your project.**
Use the elevator pitch (§1), then offer to go deep on one area — recommend the polymorphic slide model or the DB migration.

**Q: What was the hardest part?**
"Migrating from MySQL to PostgreSQL without rewriting every query. Rather than touch ~10 route files, I wrote a compatibility adapter in `db.js` that translates placeholders, insert-id handling, and error codes. The subtle bugs were the interesting part — Postgres blank-pads `CHAR`, folds unquoted identifiers to lowercase, is strict about `GROUP BY`, and returns `COUNT()` as a string. I caught them by testing every endpoint end-to-end after the switch."

**Q: What are you most proud of?**
"The extensibility of the activity system — one polymorphic `Slide` model plus a strategy-pattern renderer means a new activity type is an enum value and one component, and those components are reused inside presentations with zero duplication."

**Q: What would you do differently / improve?**
Pull from §11 — lead with WebSockets + Redis and adding tests.

### Technical / architecture
**Q: Why PostgreSQL over MySQL/NoSQL?**
Relational data + strong constraints + aggregate queries; JSONB for the few flexible fields. See §2.

**Q: How do you prevent a student from seeing quiz answers?**
Server-authoritative scoring — answers aren't in the take payload; the server scores on submit. See §6.4.

**Q: How do you stop someone voting twice without accounts?**
Session-scoped UUID token in localStorage + a `UNIQUE` DB constraint → 409 on duplicates. Defense in depth. See §6.3.

**Q: How is your live/real-time part implemented?**
Honestly: 2-second polling now; explain the WebSocket/Redis upgrade and the trade-off (§8). Showing you know *why* you chose the simpler option — and when you'd change it — is the win.

**Q: How would you scale this to 10k concurrent users?**
Stateless API behind a load balancer; move sessions and live state to Redis; WebSockets with the Socket.io Redis adapter so cross-instance rooms work; read replicas / connection pooling for Postgres; CDN for the static frontend; rate limiting.

**Q: How do you handle authz?**
Server-side `requireTeacher` middleware + owner-token checks; UI guards are convenience only. See §7.

**Q: Walk me through the DB schema / a query.**
Use §5. Be ready to explain the leaderboard query (`GROUP BY name, MAX(score)`) and the rank computation (`count of names with a strictly higher best score, + 1`).

**Q: What design patterns did you use?**
Strategy (SlideRenderer), Adapter (db.js), a single-source-of-truth config, and polymorphic modeling. See §6.

### Coding-adjacent
**Q: How would you test the scoring logic?**
Unit-test `POST /submit` with Supertest: all-correct, all-wrong, partial, blank answers, and that the response never leaks answers before submit. Test one-vote enforcement returns 409 on a repeat token.

**Q: Where could this break under concurrency?**
Two people submitting the same last vote — the `UNIQUE` constraint makes the DB the arbiter (one wins, the other gets a clean 409). The presentation `current_index` is last-write-wins, which is fine for a single presenter.

---

## 13. Numbers & facts to have ready
- **~17 tables**, **9 topics**, **80 seed questions**, **6 activity/feature types** (Quiz, Poll, Word Cloud, Survey, Q&A, Presentations) + role-based access.
- Frontend: React 19, react-router v7, Tailwind v3, Context API.
- Backend: Express 5, Passport (Google OAuth), express-session, `pg`.
- DB: PostgreSQL 16 (migrated from MySQL 8), JSONB, FKs with cascade, UNIQUE constraints.
- Live updates: 2s polling (upgrade path: Socket.io + Redis).

---

## 14. 30-second architecture whiteboard script
"React SPA talks to an Express REST API over HTTP with session-cookie auth. Express has role-gated routes and a `db.js` layer that speaks to PostgreSQL through a connection pool. Data is fully relational — users own quizzes, quizzes reference questions through a join table, and attempts feed the leaderboard. Live features poll the API every couple seconds today; the scale-up is WebSockets with Redis-backed shared state. The clever bits are a polymorphic slide model with a strategy-pattern renderer, and a database adapter that let me migrate MySQL→Postgres with minimal churn."

Good luck — you built all of this, so speak about it with ownership. 🚀

# QuizApp → Live Interactive Platform — Build Spec

Turning the current solo, static quiz app into a **Mentimeter/Kahoot-style live platform**: a host runs a real-time session, an audience joins anonymously with a code, and everyone's screen stays in sync while responses stream in live.

This spec is the source of truth for the build. It maps directly onto the **existing** codebase (Express 5, `mysql2`, Passport/Google auth, React 19 + react-router v7).

---

## 0. Current state (what we're building on)

| Layer | Today | Reused how |
|---|---|---|
| Frontend | React 19, react-router v7, axios. Routes: `/`, `/category`, `/quiz/:category`, `/scoreboard`, `/login` | Keep as "practice/solo" mode. Add a parallel **live** flow. |
| Backend | Express 5, `mysql2` (callbacks), Passport Google OAuth + express-session | Add Socket.io onto the **same** HTTP server. Hosts = existing logged-in users. |
| DB | `users`, `questions` (options as JSON string, `correctAnswer`, `category`), `scores` | `questions` becomes a seed source for `mcq_quiz` slides. New tables added alongside. |

**Design principle:** the current static quiz keeps working untouched. Live sessions are additive.

---

## 1. Target architecture

```
                 ┌─────────────────────────────────────────────┐
                 │              Express + HTTP server            │
                 │  ┌────────────┐        ┌──────────────────┐   │
  Host (auth) ───┼─▶│ REST API   │        │  Socket.io       │◀──┼── Participants
                 │  │ (sessions, │        │  (rooms = code)  │   │   (anonymous)
                 │  │  slides,   │        │                  │   │
                 │  │  results)  │        │  in-memory       │   │
                 │  └─────┬──────┘        │  RoomState       │   │
                 │        │               └────────┬─────────┘   │
                 └────────┼────────────────────────┼─────────────┘
                          │ persistent             │ ephemeral
                    ┌─────▼──────┐          (live tallies, presence,
                    │   MySQL     │           active slide index)
                    │  quizdb     │          → swappable to Redis
                    └─────────────┘
```

- **Persistent (MySQL):** users, saved sessions, slides, final responses, results.
- **Ephemeral (in-memory per room):** who's connected, the currently-active slide, running vote tallies. Lives in a `RoomState` object keyed by session code. **Structured behind an interface so it can be swapped for Redis** (pub/sub) later — that's the horizontal-scaling story, not required for the demo.

---

## 2. Data model (MySQL — persistent)

New tables alongside the existing ones. Existing `users` reused for hosts.

```sql
-- A live session a host runs
CREATE TABLE sessions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  host_id      INT NOT NULL,
  join_code    CHAR(6) NOT NULL UNIQUE,        -- e.g. "483920"
  title        VARCHAR(200),
  status       ENUM('draft','live','ended') DEFAULT 'draft',
  current_slide_index INT DEFAULT -1,          -- -1 = lobby
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at     TIMESTAMP NULL,
  FOREIGN KEY (host_id) REFERENCES users(id)
);

-- Polymorphic slide: ONE table for every content type
CREATE TABLE slides (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  session_id   INT NOT NULL,
  position     INT NOT NULL,                   -- order in the deck
  type         ENUM('mcq_quiz','poll','word_cloud','open_feedback','qna') NOT NULL,
  prompt       TEXT NOT NULL,                  -- the question/heading shown
  config       JSON NOT NULL,                  -- type-specific (see below)
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE KEY (session_id, position)
);

-- Every submission from a participant (anonymous, session-scoped)
CREATE TABLE responses (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  slide_id          INT NOT NULL,
  participant_token CHAR(36) NOT NULL,         -- per-session UUID, NOT a user account
  payload           JSON NOT NULL,             -- type-specific (see below)
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slide_id) REFERENCES slides(id) ON DELETE CASCADE,
  INDEX (slide_id)
);

-- Optional: lightweight presence/nickname record (can also stay purely in-memory)
CREATE TABLE participants (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  session_id  INT NOT NULL,
  token       CHAR(36) NOT NULL,
  nickname    VARCHAR(40),
  joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE KEY (session_id, token)
);
```

### `slides.config` shape per type
```jsonc
// mcq_quiz  — has a right answer, timed, scored
{ "options": ["Paris","London","Rome"], "correctIndex": 0, "timeLimitSec": 20, "points": 1000 }

// poll      — no right answer
{ "options": ["Cats","Dogs","Neither"], "chart": "bar" }   // or "pie"

// word_cloud
{ "maxWords": 3, "maxLen": 24 }

// open_feedback
{ "mode": "text" }                      // or "rating" with { "mode":"rating", "scale":5 }

// qna
{ "allowUpvotes": true }
```

### `responses.payload` shape per type
```jsonc
{ "choiceIndex": 2, "answeredAtMs": 1450 }   // mcq_quiz / poll
{ "words": ["fast","fun","live"] }           // word_cloud
{ "text": "Loved the pacing" }               // open_feedback (text)
{ "rating": 4 }                              // open_feedback (rating)
{ "text": "Will slides be shared?" }         // qna  (upvotes tracked in-memory + votes table optional)
```

> **Why this is a strong interview point:** one polymorphic `Slide` entity + a JSON `config`/`payload` instead of five parallel tables and five codepaths. Adding a 6th content type = new enum value + one renderer + one aggregator. No schema explosion.

---

## 3. Ephemeral room state (in-memory, Redis-ready)

```js
// server/live/RoomState.js  — one instance per live session code
{
  code: "483920",
  hostSocketId: "abc",
  sessionId: 12,
  currentSlideIndex: -1,          // -1 = lobby
  participants: Map<token, { socketId, nickname }>,
  tallies: Map<slideId, Aggregator>,   // live counts, see §5
}
```

- Accessed only through a `RoomStore` interface (`get(code)`, `set`, `delete`).
- **Redis swap (scaling talking point):** back `RoomStore` with Redis + use the Socket.io Redis adapter so participant sockets landing on a different server instance than the host still share room state via pub/sub. Not built now; the interface makes it a drop-in.

---

## 4. Socket.io event contract

Namespace: default. Room name = `join_code`.

### Host → Server
| Event | Payload | Effect |
|---|---|---|
| `host:create-session` | `{ sessionId }` | Creates room, joins host socket, returns `{ code, qr }` |
| `host:start` | `{}` | `status → live`, broadcast `session:started` |
| `host:goto-slide` | `{ index }` | Sets `currentSlideIndex`, broadcast `slide:changed` |
| `host:next` / `host:prev` | `{}` | Convenience wrappers around goto |
| `host:reveal` | `{}` | For `mcq_quiz`: broadcast `slide:reveal` with correct answer + leaderboard |
| `host:end` | `{}` | `status → ended`, broadcast `session:ended`, persist tallies |

### Participant → Server
| Event | Payload | Effect |
|---|---|---|
| `participant:join` | `{ code, nickname }` | Validates code, assigns `participant_token`, joins room → `session:state` |
| `participant:submit` | `{ slideId, payload }` | Rate-limited; writes response; updates tally → emits `response:accepted` to sender, `tally:updated` to host |

### Server → clients (broadcasts)
| Event | Audience | Payload |
|---|---|---|
| `session:state` | joining participant | `{ status, currentSlideIndex, slide, participantCount }` |
| `session:started` | room | `{}` |
| `slide:changed` | room | `{ index, slide }` (participant view omits `correctIndex`) |
| `slide:reveal` | room | `{ slideId, correctIndex, distribution, leaderboard }` |
| `presence:update` | room | `{ participantCount }` |
| `tally:updated` | host only | `{ slideId, aggregate }` (see §5 per-type shape) |
| `session:ended` | room | `{ summaryUrl }` |

**Security / anti-abuse:**
- `correctIndex` is **stripped** from any slide payload sent to participants; scoring happens server-side.
- Per-socket **rate limit** on `participant:submit` (e.g. 1 submit/slide for mcq/poll, token-bucket for word_cloud/qna).
- `participant_token` is a session-scoped UUID (issued on join), **not** an account — that's the "anonymous but abuse-resistant" story. One vote per token per slide enforced on the server.

---

## 5. Strategy pattern (the extensibility core)

Two interfaces, five implementations each. No `switch` sprawl in the transport layer.

```
server/live/aggregators/
  Aggregator.js            // interface: add(payload), snapshot(), finalResult()
  McqAggregator.js         // counts per option + per-token scoring by speed
  PollAggregator.js        // counts per option
  WordCloudAggregator.js   // Map<word, freq>, normalized
  FeedbackAggregator.js    // list (text) OR rating histogram
  QnaAggregator.js         // questions[] with upvote counts, sorted

frontend/src/live/renderers/
  participant/  <McqCard/> <PollCard/> <WordInput/> <FeedbackInput/> <QnaBoard/>
  host/         <McqChart/> <PollChart/> <WordCloudView/> <FeedbackFeed/> <QnaList/>
```

- Server picks the aggregator by `slide.type` once, per slide.
- Frontend has a `renderSlide(slide, role)` factory → returns the right component for participant vs. host (presenter) view.
- `tally:updated` payload = `aggregator.snapshot()`, so each chart just renders whatever shape its aggregator emits.

Aggregator snapshot shapes:
```jsonc
mcq_quiz / poll : { counts: [12, 4, 7], total: 23 }
word_cloud      : { words: [{text:"fast", value:9}, ...] }
open_feedback   : { items:[{text,ts}], count } | { histogram:[0,1,4,9,3], avg:3.8 }
qna             : { questions:[{id,text,votes,answered}], ... }  // sorted by votes
```

---

## 6. REST API (persistent CRUD — auth-gated for hosts)

Keep Socket.io for real-time; REST for setup/history.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/sessions` | Create a session (draft) for logged-in host |
| `GET` | `/api/sessions/:id` | Load a session + its slides (host-only) |
| `POST` | `/api/sessions/:id/slides` | Add a slide |
| `PUT` | `/api/slides/:id` | Edit a slide |
| `DELETE`| `/api/slides/:id` | Remove a slide |
| `POST` | `/api/sessions/:id/seed-from-quiz` | Bootstrap `mcq_quiz` slides from existing `questions` table by category |
| `GET` | `/api/sessions/:id/results` | Final aggregated results (post-session review) |
| `GET` | `/api/join/:code` | Public: validate a code before socket connect |

Existing `/api/questions`, `/api/submit-score`, `/api/leaderboard`, and all `/api/auth/*` stay as-is.

---

## 7. Frontend additions

New routes (existing ones untouched):
```
/host                      → dashboard: my sessions, "Create session"
/host/session/:id/edit     → build the slide deck
/host/session/:id/present  → PRESENTER MODE (big screen, QR, live charts)
/join                      → enter 6-digit code
/play/:code                → participant view (mobile-first, one slide at a time)
```

New dependencies:
```
frontend:  socket.io-client  framer-motion  qrcode.react
           react-d3-cloud (or react-wordcloud)  recharts (or hand-rolled bars)
           canvas-confetti
backend:   socket.io   express-rate-limit   uuid
```

**"Crazy" demo touches:** QR join screen, live participant-count ticker, Framer Motion slide transitions that fire on every screen at once, confetti + sound on `slide:reveal`, distinct big-screen presenter vs. mobile participant layouts, dark gradient theme.

---

## 8. Build order (sprints)

Each sprint ends with something runnable/demoable.

- **Sprint 0 — Foundation & security.**
  `.gitignore` + remove committed `.env`, move DB creds into `dotenv`, rotate exposed secrets. Add `socket.io` to the existing server. Create `sessions`/`slides`/`responses`/`participants` tables. Bare `RoomStore` + `RoomState`. Health-check socket round-trip.

- **Sprint 1 — Session engine + join flow (the spine).**
  Host creates session → 6-digit code + QR. Participant joins `/play/:code`, gets a token, lands in a lobby. Live participant-count ticker. Host `next/prev` moves everyone together. *No question types yet — just sync.*

- **Sprint 2 — Live MCQ quiz.**
  `mcq_quiz` slide end-to-end: timed answer, server-side scoring by speed, `slide:reveal` with correct answer + animated answer-distribution bars + leaderboard + confetti. Seed from existing `questions` table.

- **Sprint 3 — Polls.** Same mechanic, no right/wrong. Animated bar/pie via the Poll aggregator + renderer.

- **Sprint 4 — Word cloud.** Text submissions → live frequency Map → growing word cloud on presenter screen, words scale in real time.

- **Sprint 5 — Anonymous feedback.** Free-text live-scrolling feed OR rating-scale histogram (two `config` modes, one type).

- **Sprint 6 — Q&A + upvotes.** Participants submit questions, upvote others', host sees live sorted-by-votes list, marks "answered."

- **Sprint 7 — Presenter polish.** Slide transitions synced across screens, dark gradient theme, sound, session summary/results page.

- **(Stretch) Sprint 8 — Redis.** Swap `RoomStore` to Redis + Socket.io Redis adapter; document the multi-instance scaling story.

---

## 9. Interview talking points this unlocks

- **Real-time architecture:** Socket.io rooms keyed by code, host/broadcast patterns, server-authoritative state.
- **Polymorphic schema:** one `Slide` entity + JSON config vs. five tables; strategy pattern for aggregation/rendering.
- **Anonymous but abuse-resistant:** session-scoped tokens (not accounts), server-side one-vote enforcement, rate limiting.
- **State sync** between one host and N participants; reveal/scoring done server-side so clients can't cheat.
- **Horizontal scaling:** why WebSocket servers need shared state, Redis pub/sub + Socket.io adapter, the `RoomStore` seam that makes it a swap.
```

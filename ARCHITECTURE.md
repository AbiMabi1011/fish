# Architecture and assessment themes

The React presentation is retained from the user's game. Platform services have been replaced with a same-origin HTTP API and local SQLite storage.

| Concern | Implementation |
| --- | --- |
| Browser routing/presentation | `src/routes`, `src/components`, plain Vite and TanStack Router |
| Identity | `src/identity/AuthProvider.tsx`, `server/store.mjs` and `/api/auth/*` |
| Shared game rules | `src/game/GameEngine.ts`, compiled for the backend as `server/engine.mjs` |
| Events | `src/game/eventBus.ts`; the React `useGame` adapter reads server event revisions |
| External interoperability | `server/puzzles.mjs` calls Marc Conrad's HTTPS/JSON/base64 API |
| Persistence | `server/store.mjs`: SQLite users, sessions, games, wallets and rooms |
| Progress UI | `src/services/progressService.ts`, `src/routes/journey.tsx` |
| Multiplayer | `server/duels.mjs`, `src/services/duelService.ts`, `src/game/useDuel.ts` |

**Low coupling and high cohesion.** The engine takes a puzzle provider and emits typed events without knowing React or SQLite. The Node API connects engine, identity and storage. UI routes depend on small service modules. Tests inject puzzle providers and in-memory databases. A monolith would be quicker initially but mix concerns; separate network microservices would add unnecessary deployment complexity here.

**Event-driven programming.** Button/form events generate HTTP actions. The server engine emits state changes, ticks, answers and game-over events. Polling exposes versioned snapshots to React. On game-over, server storage saves scores and awards progress atomically using a unique game ID; replaying a result request does not award twice. Polling is simpler than operating a WebSocket service, at the cost of periodic requests and a short display delay.

**Interoperability.** The backend calls the independent PHP Fish Game API over HTTPS, validates its JSON, and adapts base64 PNGs and counts to internal puzzle objects. The browser talks to the Node backend using HTTP/JSON. SQLite replaces the cloud database. The artwork and fonts are local files. API outage/timeout is shown as a retryable error; no pretend puzzles silently replace the external API.

**Virtual identity.** Immediate local email/password registration establishes an account without email verification. Scrypt and a random salt derive password hashes; plaintext passwords are not stored. A random session token is delivered in an HttpOnly, SameSite cookie; the database stores its digest and expiry. Backend actions derive ownership from the authenticated session, not a submitted user ID. Cookies expire after seven days and logout revokes the token. Email is an unverified identifier, not proof of ownership; a publicly hosted service would need a more complete account/recovery policy.

Server timing and score calculation prevent users from posting arbitrary wallet values. This is not a competitive anti-cheat system: the solo scene needs fish counts to render its illustrated presentation, so a technically skilled player can inspect the client representation. Duels return the raw puzzle image and keep answer counts on the backend until submission.

For the assessment, demonstrate the app and reflect on decisions and alternatives in your own voice. These notes do not replace your authentic video or tutor-presentation evidence. Acknowledge the AI-assisted and adapted source.

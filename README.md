# Treasure Count — independent edition

React + TypeScript, Vite, a Node.js backend and a local SQLite database. This game no longer requires a Lovable account, Lovable Cloud, Supabase, email delivery, OAuth, vendor hosting plugins or vendor telemetry. The Fish Game API is still required for new puzzles. Artwork, avatars and fonts are served locally.

## Start on Windows

Install **Node.js 24 or newer**, extract this project, and double-click `START-GAME.cmd`. The packaged build opens at **http://127.0.0.1:3002** and needs no npm installation to play. Keep the terminal open while playing.

For source development, open a terminal in the project folder:

```powershell
npm ci
npm run dev
```

In development, open **http://127.0.0.1:5174**. Keep the terminal open; Ctrl+C stops both servers. The frontend uses port 5174 and the API uses port 3002. Internet access is needed for the first dependency installation and for new Fish Game API puzzles.

For a production-style local run:

```powershell
npm run build
npm start
```

Open **http://127.0.0.1:3002**. No third-party hosting service is required.

## Register and play

Choose **Create an account**, enter a player name, email and password of 8–128 characters. Registration signs you in immediately. **No confirmation email is sent or required.** The email is a local account identifier; this version does not verify ownership of it. Create a new local account even if you previously registered in the cloud version. Cloud passwords and saved progress have not been imported.

Solo games use three lives, an initial 20-second timer and the existing progressive difficulty/scoring rules. Journey has XP, coins, seashells, quests, daily chests, fourteen map gifts and avatar unlocks. The server computes scores and rewards and rejects repeated gift claims. Scrolling adds vertical depth to decorative fish while their normal swimming direction continues.

Ocean Journey includes eight named reefs, animated trail currents and stage beacons, a floating player marker, treasure previews with exact rewards, animated wallet/XP displays, and a daily-reset countdown. Daily quests and chests reset at midnight UTC, matching the server. Reward reveals use keyboard-accessible dialogs and celebratory animation. Reduced-motion preferences disable decorative motion. The visual upgrade does not change prices, rewards, progression or unlock requirements.

Duels support two authenticated users connected to the **same server**. For local testing, use two separate browser profiles or a normal and private browser window so each has its own login. Create a room, share the eight-character code, join with the second account, then start as host. The server supplies ten shared puzzles and enforces round order, membership, deadlines and scores. Loopback addresses are not accessible to friends on other computers; internet play requires deploying your own server.

## Data

The server creates `data/treasure.sqlite`. Back up the entire `data` directory with the server stopped. Users, password hashes, completed scores, progress and duel rooms persist. Active solo games live in server memory and end on a server restart; completed rewards remain saved. Restarting does not reset accounts or Journey progress. Installed dependencies, runtime databases and test accounts are excluded from the downloadable source ZIP.

The local system uses salted scrypt password hashes, random expiring session tokens, hashed tokens in SQLite, HttpOnly/SameSite cookies, origin checks, parameterized SQL, and a basic sign-in rate limit. It is an educational single-process server. There is no email password recovery, MFA or distributed rate limiter. For a public deployment use HTTPS, `COOKIE_SECURE=true`, an exact `APP_ORIGIN`, persistent storage, a reviewed abuse-control strategy and backups. No Google sign-in is configured in this independent edition; that would require your own OAuth credentials and integration.

## Verify

```powershell
npm test
npm run build
```

Tests cover game rules, UI access, local registration, sessions, progress, duplicate rewards, avatar purchases, duel membership, deadlines and replay protection. Tests do not send email. The live integration check used a separate test database and the real Fish Game API to register, complete four rounds, save results, and sign out/in.

`server/engine.mjs` is generated from `src/game/GameEngine.ts` by `npm run build:engine`, included in `dev` and `build`; edit the TypeScript source, then restart the backend to apply engine changes.

See `ARCHITECTURE.md` and `REFERENCES.md`. The original exported project is preserved separately; this directory is the independent application to continue developing.

### Living reef
Ocean Journey includes a persistent decoration shop. Coins buy coral (60), kelp (90), and a castle (200, player level 2). Seashells buy a turtle (2) or jellyfish (3, level 2). The explorer crown costs 300 coins and 1 seashell at level 3. XP unlocks tiers and is never spent. Purchases automatically place items; owned decorations can be stored and placed freely. The server validates all balances, ownership and XP requirements in an atomic transaction. Repeating a purchase never charges twice. Existing accounts receive empty reef collections automatically.

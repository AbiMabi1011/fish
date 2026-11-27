# CIS045-3 Video Presentation Script — Treasure Count

- **Unit:** CIS045-3 Distributed Service Architectures (Assignment 1 — 60%)
- **Target Length:** ~7.5 to 8.5 minutes (**strict max: 10 minutes**)
- **Recording Tool:** OBS Studio or Panopto (must use **your own voice**; minimal editing)
- **Important Reminder:** Do not use AI to generate the video audio. Speak naturally in your own voice using this script as your guide.

---

## Before You Hit Record (Quick Setup)

1. Start the game locally (`http://127.0.0.1:3002`) and open it in **two browser windows**:
   - **Window 1 (Normal browser):** Signed in as Player 1.
   - **Window 2 (Incognito / Private window):** Ready on `/auth` to demo signing in as Player 2 for the 2-Player Duel + Play Again rematch.
2. Open these **7 files in VS Code tabs** in this exact order (press `Ctrl +` once or twice so the code is easy to read in the video):
   1. `src/game/GameEngine.ts` *(Theme 1: Low Coupling & High Cohesion)*
   2. `src/game/stageRules.ts` *(Theme 1: Pure helper rules)*
   3. `src/game/eventBus.ts` *(Theme 2: Event-Driven Programming)*
   4. `server/index.mjs` *(Theme 2: Event Subscribers + Theme 4: Cookies)*
   5. `server/puzzles.mjs` *(Theme 3: Interoperability — Marc Conrad Fish API)*
   6. `server/store.mjs` *(Theme 4: Virtual Identity — Password Hashing & Sessions)*
   7. `src/identity/AuthProvider.tsx` *(Theme 4: Virtual Identity — Frontend Context)*
3. Keep a terminal open at the bottom of VS Code ready to run `npm test` at the end.

---

## Scene 1 — Introduction (0:00 – 0:30)

**`[ON SCREEN]`** Show the **Treasure Count** welcome screen (`http://127.0.0.1:3002`).

**`[SPEAK]`**
> "Hello everyone. My name is [Your Name], and this is my coursework video for CIS045-3 Distributed Service Architectures.
>
> My project is **Treasure Count**, a full-stack fish-counting puzzle game built with React, TypeScript, and Node.js. It uses Marc Conrad's external Fish Game API.
>
> In this video, I will first give a short live demonstration of the working game, and then walk through my source code to discuss the four core themes:
> 1. Software Design Principles — Low Coupling and High Cohesion,
> 2. Event-Driven Programming,
> 3. Interoperability, and
> 4. Virtual Identity."

---

## Scene 2 — Short Live Demonstration (0:30 – 2:10)

**`[ON SCREEN]`**
1. Click **Sign in** → show `/auth` (briefly show Sign in / Register tabs), then sign in as Player 1.
2. Click your **Avatar** in the top bar to show customizable avatars, then close it.
3. Click **Play game** → show **Single Play** and **2 Players**.
4. Click **Single Play** → play 2 rounds (show the live Fish API image, answer one round by clicking the number pad and one round using keyboard keys `0–9`, show score, streak, lives, and timer updating).
5. Click **Leaderboard** in the top bar to show saved scores.
6. Go to **2 Players** (`/online`), click **Create room**, copy the 8-character room code.
7. Switch to the **Incognito window** (Player 2), paste the code, click **Join room**.
8. Player 1 clicks **Start match** → show both players getting the exact same Fish API puzzle, play 1–2 rounds, and briefly mention the **Play again** rematch button (which waits for the opponent to accept before starting a fresh match).

**`[SPEAK]`**
> "Let's start with a quick demo of the working system.
>
> First, a player signs in or registers on the Auth page. Once signed in, they have their own profile and can choose their avatar in the header.
>
> From the home screen, players can choose **Single Play** or **2 Players**.
>
> In **Single Play**, each round displays the actual puzzle image fetched live from Marc Conrad's Fish API. Players can click the number buttons or press `0` to `9` on their keyboard. Faster answers and streaks earn higher points, and finished scores are automatically saved to the **Leaderboard**.
>
> In **2-Player Online Duel**, one player creates a room to get an 8-character code, and a second player joins with that code. When the host starts the match, both players receive the exact same 10 Fish API puzzles and race against a 15-second timer. After the match ends, either player can click **Play again**, and once the opponent accepts, a fresh match starts automatically in the same room.
>
> The layout is also responsive so it works on desktop, tablet, and mobile screens."

---

## Scene 3 — Theme 1: Software Design Principles — Low Coupling & High Cohesion (2:10 – 3:40)

*(Rubric 70%+ goal: Critically discuss component structure AND consider alternative approaches.)*

**`[ON SCREEN]`** Switch to VS Code:
- Show the folder structure (`src/game/`, `src/services/`, `src/identity/`, `src/routes/`, `server/`).
- Open **`src/game/GameEngine.ts`** (scroll lines 1–60).
- Briefly click **`src/game/stageRules.ts`** and mention **`server/store.mjs`** vs **`server/postgres-store.mjs`**.

**`[SPEAK]`**
> "Now let's discuss the first theme: **Software Design Principles — Low Coupling and High Cohesion**.
>
> **High cohesion** means each module has one clear responsibility. You can see this in my folder structure:
> - `src/game/` holds the game rules,
> - `src/services/` handles HTTP API calls,
> - `src/identity/` handles user authentication state,
> - `src/routes/` handles only the UI pages, and
> - `server/` runs the backend logic and database storage.
>
> Look at `GameEngine.ts`. It has high cohesion because it only manages game rules — score, lives, streak, timer, and rounds. It has **zero React and zero HTML** inside it.
>
> It also achieves **low coupling** through **dependency injection**. Instead of calling the Fish API directly inside `GameEngine`, the puzzle fetcher is passed into the constructor. Because of this, I can unit-test `GameEngine` in `game-engine.test.ts` using a fake puzzle function without needing the internet.
>
> Similarly, on the backend, `server/store.mjs` (SQLite) and `server/postgres-store.mjs` (PostgreSQL) implement the exact same store methods. So the server can switch between local SQLite and cloud PostgreSQL just by setting `DATABASE_URL`, without changing a single line of game logic.
>
> **Considering alternative approaches:** A simpler alternative would be putting all game rules, timers, API calls, and UI inside one big React component. That might be faster to start, but it creates tight coupling — changing the UI could accidentally break scoring, and testing the rules in isolation would be very difficult. Separating the engine, rules, and storage makes the system much easier to test, maintain, and scale."

---

## Scene 4 — Theme 2: Event-Driven Programming (3:40 – 5:00)

*(Rubric 70%+ goal: Justify the approach taken when implementing events and event handlers.)*

**`[ON SCREEN]`**
- Open **`src/game/eventBus.ts`** (full file — 28 lines).
- Switch to **`server/index.mjs`** (scroll to lines 59–70 showing `s.engine.events.on(...)`).

**`[SPEAK]`**
> "The second theme is **Event-Driven Programming**.
>
> In `src/game/eventBus.ts`, I implemented a typed Publish-Subscribe `EventBus` using the **Observer pattern**. It has `.on(event, listener)` to subscribe and `.emit(event, payload)` to publish events.
>
> Whenever something important happens in `GameEngine.ts` — such as the timer ticking (`tick`), state updating (`stateChanged`), a player answering (`answered`), or the game finishing (`gameOver`) — the engine simply emits an event without knowing who is listening.
>
> Then here in `server/index.mjs`, the backend subscribes to those events using `.on()`. When `gameOver` fires, the listener automatically saves the player's score and rewards to the database.
>
> On the frontend, the user interface is also event-driven: buttons listen to `onClick`, forms listen to `onSubmit`, and both game modes attach a `window.addEventListener('keydown', ...)` handler so players can answer immediately using keys `0` to `9`.
>
> **Justifying this approach:** An alternative would be having `GameEngine` directly call database functions or UI callbacks. However, that would tightly couple the game rules to the database. Using an `EventBus` keeps the publisher and subscribers decoupled — I can add new listeners (like sound effects, logging, or analytics) without modifying `GameEngine` itself."

---

## Scene 5 — Theme 3: Interoperability (5:00 – 6:20)

*(Rubric 70%+ goal: Critically justify the approaches taken to include third-party software / web service.)*

**`[ON SCREEN]`**
- Open **`server/puzzles.mjs`** (full file).
- Briefly show **`src/services/fishApi.ts`** (`toPuzzle` and `Puzzle` interface) and **`server/duels.mjs`** (`puzzle()`).

**`[SPEAK]`**
> "The third theme is **Interoperability** — making our application work with third-party software running on a completely different server and architecture.
>
> Our Node.js backend communicates with Marc Conrad's external Fish Game API (`https://marcconrad.com/uob/fish/api.php`) over standard **HTTP** using **JSON** as the platform-independent data format.
>
> In `server/puzzles.mjs`, I used the **Adapter pattern**:
> 1. It sends an HTTP GET request with a 12-second timeout.
> 2. It validates the external JSON (`question`, `fish`, and `chest`) to make sure the counts are valid integers and the base64 PNG image is well-formed.
> 3. It converts the external format into our own internal `Puzzle` shape: `{ imageUrl, fish, chests }`.
>
> Because of this adapter, if the external API ever changes a field name, I only have to update one file instead of the entire app.
>
> **Critically justifying this approach:** Instead of calling Marc Conrad's API directly from the browser, I proxy it through my Node.js backend. Why? Three reasons:
> 1. **Security & anti-cheat:** In 2-player duels (`server/duels.mjs`), the backend keeps the `fish` answer secret on the server and only sends `imageUrl` to the players, so nobody can inspect the network tab to cheat.
> 2. **Reliability & CORS:** Calling from the backend avoids browser CORS restrictions and lets us handle timeouts cleanly.
> 3. **Protocol choice:** Using lightweight REST/JSON is much simpler and faster for a real-time counting game than heavier alternatives like SOAP/XML."

---

## Scene 6 — Theme 4: Virtual Identity (6:20 – 7:45)

*(Rubric 70%+ goal: Critically discuss authentication mechanisms, security role, AND alternative approaches.)*

**`[ON SCREEN]`**
- Open **`server/store.mjs`** (show password hashing with `scrypt` + `salt` + `timingSafeEqual` and `sessions` table).
- Switch to **`server/index.mjs`** (show `HttpOnly` cookie creation and `store.user(token)`).
- Switch to **`src/identity/AuthProvider.tsx`** (show `/auth/me`, `signOut`, `selectAvatar`).

**`[SPEAK]`**
> "The fourth theme is **Virtual Identity**, which allows the system to distinguish between different players and protect each player's data.
>
> In `server/store.mjs`, when a user registers, we never store plain-text passwords. Instead, we generate a unique random **salt** per user and hash the password using Node's **`scrypt`** key derivation function. During login, we verify the hash using **`timingSafeEqual`** to prevent timing attacks.
>
> Once authenticated, the server creates a random session token, stores its hash in the `sessions` table, and sends the token to the browser inside an **`HttpOnly`, `SameSite=Lax` cookie**.
>
> On the frontend, `AuthProvider.tsx` calls `/api/auth/me` on page load to identify the current user and share their profile and avatar across every page. Every leaderboard score, personal best, unlocked avatar, and 2-player duel room membership is tied to that verified user ID on the server.
>
> **Critically discussing alternatives:**
> - One alternative is storing a **JWT in `localStorage`**. While JWTs are stateless, storing tokens in `localStorage` makes them readable by JavaScript, which is vulnerable to **XSS (Cross-Site Scripting)** attacks. Using an **`HttpOnly` cookie** prevents JavaScript from reading the session token, and server-side sessions allow immediate logout/revocation.
> - Another alternative is **OAuth 2.0 / OpenID Connect** (like Google Sign-In), which avoids managing passwords altogether, though it adds a dependency on an external identity provider. Our local salted-hash + HttpOnly cookie design keeps authentication self-contained and secure."

---

## Scene 7 — Testing, AI Acknowledgement & Closing (7:45 – 8:20)

**`[ON SCREEN]`** Open the VS Code terminal and run `npm test` (showing **31/31 Vitest tests** and **9/9 backend tests** passing).

**`[SPEAK]`**
> "Finally, I verified the system with automated tests using `npm test`: 31 frontend tests in Vitest and 9 backend tests covering game rules, authentication, cookies, 2-player duels, rematch acceptance, SQLite, and PostgreSQL persistence.
>
> As required by the assignment brief, all external libraries, Marc Conrad's Fish API, and AI coding assistance are clearly referenced in `REFERENCES.md` and in my source code comments.
>
> Thank you for watching!"

---

## Final Submission Checklist (from the Assignment Brief)
- [ ] Video is **under 10 minutes** (aim for ~8 minutes) and uses **your own voice**.
- [ ] Video starts with a **short live demo**, then discusses all **4 themes** using your code.
- [ ] Upload **full source code** alongside the video (not just visible in the video).
- [ ] Keep a local copy of your video and upload to **BREO** (or OneDrive/Panopto/YouTube link with open access if the file is too large) **before Thursday, 3rd December 2026** (deadline: **10 a.m. on 04/12/2026**).
- [ ] Include evidence that you presented your work in **Week 8** (or earlier).

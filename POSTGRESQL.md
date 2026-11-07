# PostgreSQL setup

The server selects PostgreSQL when DATABASE_URL is set. Without it, local development uses the existing SQLite file.

1. Create a PostgreSQL database and set DATABASE_URL in the host's server environment. Keep the provider's TLS settings intact. Never put the URL in a VITE variable or frontend code.
2. Stop the game before importing existing data. Keep a backup of data/treasure.sqlite and its WAL files.
3. From this folder, run npm run db:import-sqlite with DATABASE_URL set. The import reads a consistent SQLite snapshot and installs it into an empty PostgreSQL database in one transaction. Account IDs, password hashes, sessions, scores, progress, aquarium fish and rooms are copied. Repeating the identical import succeeds without charging rewards or duplicating rows. A populated, different target is rejected.
4. Run npm run build, then npm start. Set APP_ORIGIN to the public HTTPS origin, COOKIE_SECURE=true and HOST=0.0.0.0 on the host. Use the host's assigned PORT.

For local use with an environment file, copy .env.example to .env and run:

    node --env-file=.env server/import-sqlite.mjs
    node --env-file=.env server/index.mjs

The Node server serves both the built React app and /api routes. Configure a single backend instance initially because active solo games are held in server memory. Database transactions protect wallets and duel room changes, with retries for PostgreSQL serialization conflicts.

The deployment connection and remote import must still be performed once a PostgreSQL database is provisioned. Set credentials privately in the host or local .env file.

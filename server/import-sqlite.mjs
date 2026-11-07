import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPostgresDatabase } from "./postgres-db.mjs";

const tables = ["users", "sessions", "progress", "games", "rooms"];
export async function importSqlite(source, target) {
  const sqlite = new DatabaseSync(source, { readOnly: true });
  let snapshot;
  try {
    sqlite.exec("BEGIN");
    snapshot = Object.fromEntries(
      tables.map((table) => [
        table,
        sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(),
      ]),
    );
    sqlite.exec("COMMIT");
  } finally {
    sqlite.close();
  }
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
  await target.query(
    "CREATE TABLE IF NOT EXISTS sqlite_imports (fingerprint TEXT PRIMARY KEY, imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  return target.transaction(async () => {
    // Exclude live writes while installing a complete, consistent snapshot.
    await target.query(
      "LOCK TABLE users, sessions, progress, games, rooms, sqlite_imports IN ACCESS EXCLUSIVE MODE",
    );
    const previous = await target.query(
      "SELECT fingerprint FROM sqlite_imports WHERE fingerprint=$1",
      [fingerprint],
    );
    if (previous.rows.length) return { alreadyImported: true };
    for (const table of tables) {
      const result = await target.query(
        `SELECT count(*) AS count FROM ${table}`,
      );
      if (Number(result.rows[0].count))
        throw new Error(
          "Import requires an empty target database. Existing records were left intact.",
        );
    }
    const counts = {};
    for (const table of tables) {
      for (const row of snapshot[table]) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        if (table === "games") {
          const position = columns.indexOf("created_at");
          if (/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(values[position]))
            values[position] += "+00";
        }
        const placeholders = columns.map((_, i) => "$" + (i + 1));
        await target.query(
          `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders.join(",")})`,
          values,
        );
      }
      counts[table] = snapshot[table].length;
    }
    await target.query("INSERT INTO sqlite_imports(fingerprint) VALUES ($1)", [
      fingerprint,
    ]);
    return counts;
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to your PostgreSQL connection string.");
  const target = await createPostgresDatabase(process.env.DATABASE_URL);
  try {
    const source = resolve(process.env.DATA_FILE || "data/treasure.sqlite");
    console.log("Import finished:", await importSqlite(source, target));
  } finally {
    await target.close();
  }
}

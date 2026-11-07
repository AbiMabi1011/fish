import { AsyncLocalStorage } from "node:async_hooks";
import { readFile } from "node:fs/promises";
import pg from "pg";

export async function createPostgresDatabase(connectionString, suppliedPool) {
  const pool =
    suppliedPool ??
    new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 10000 });
  const context = new AsyncLocalStorage();
  pool.on?.("error", () => console.error("PostgreSQL pool connection failed."));
  try {
    await pool.query(
      await readFile(new URL("./postgres-schema.sql", import.meta.url), "utf8"),
    );
  } catch (error) {
    await pool.end();
    throw error;
  }

  async function query(sql, values = []) {
    return (context.getStore() ?? pool).query(sql, values);
  }

  async function transaction(operation) {
    if (context.getStore()) return operation();
    for (let attempt = 0; attempt < 5; attempt++) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const result = await context.run(client, operation);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        if (!["40001", "40P01"].includes(error.code) || attempt === 4)
          throw error;
      } finally {
        client.release();
      }
    }
  }

  return {
    query,
    transaction,
    close: () => pool.end(),
    prepare(sql) {
      let number = 0;
      const statement = sql.replace(/\?/g, () => "$" + ++number);
      return {
        async get(...values) {
          return (await query(statement, values)).rows[0];
        },
        async all(...values) {
          return (await query(statement, values)).rows;
        },
        async run(...values) {
          return query(statement, values);
        },
      };
    },
  };
}

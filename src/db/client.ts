import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Returns a database client, or undefined when DATABASE_URL is not configured. */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  cached ??= drizzle(postgres(url, { max: 5, prepare: false }), { schema });
  return cached;
}

export { schema };

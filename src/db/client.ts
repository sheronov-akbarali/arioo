import "server-only";
import { setDefaultResultOrder } from "node:dns";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

// Node's default DNS order surfaces IPv6 addresses first. On networks without
// an outbound IPv6 route (e.g. this sandbox), undici's fetch — which the Neon
// serverless driver uses — hangs on those and never falls back, surfacing as
// "TypeError: fetch failed" instead of a normal connection error.
setDefaultResultOrder("ipv4first");

// Even IPv4-only, this sandbox's egress to Neon is intermittently flaky
// (observed: identical requests alternating between <1s success and
// ETIMEDOUT). A couple of quick retries absorb that transient packet loss
// instead of surfacing every blip as a fatal query error.
const FETCH_RETRIES = 10;
neonConfig.fetchFunction = async (url: string | URL | Request, init?: RequestInit) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt >= FETCH_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
};

// Created lazily, on first query, rather than at module load. Next.js's build
// step imports route handler modules to collect page data, which would
// otherwise crash the build if DATABASE_URL isn't present in that context.
let _db: NeonHttpDatabase<typeof schema> | undefined;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getDb(), prop, receiver);
    },
  },
);

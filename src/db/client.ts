import "server-only";
import { setDefaultResultOrder } from "node:dns";
import { drizzle } from "drizzle-orm/neon-http";
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
const FETCH_RETRIES = 4;
neonConfig.fetchFunction = async (url: string | URL | Request, init?: RequestInit) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt >= FETCH_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
};

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

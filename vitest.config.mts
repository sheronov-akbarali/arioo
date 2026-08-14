import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Next.js loads .env.local automatically; Vitest doesn't, so tests that
// touch the real DB (e.g. session.test.ts) need it loaded explicitly.
config({ path: ".env.local" });

// Vitest doesn't read tsconfig.json's `paths`, so tests using the `@/*`
// alias (mirroring tsconfig.json) need it declared here too.
export default defineConfig({
  // `import "server-only"` throws unless resolved under the "react-server"
  // export condition (its no-op build). A global `resolve.conditions`
  // override would make that condition win for every package, not just this
  // one — including "react" itself, which has its own "react-server" build
  // that lacks client APIs like useState, silently breaking any future
  // component/hook test. Alias only this one package to its own no-op entry
  // instead, so nothing else's module resolution is affected.
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // "**/" prefixes matter here: without them these only match at repo
    // root, so nested git worktrees under .claude/worktrees/** or
    // .worktrees/** (which carry their own node_modules) leak their tests
    // into runs from the main tree.
    exclude: ["**/node_modules/**", "tests/e2e/**", "**/.claude/**", "**/.worktrees/**"],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  // The modules under test are Server Components / server-only modules. The
  // "react-server" condition makes `import "server-only"` resolve to its no-op
  // entry here, exactly as it does in Next.js's RSC bundling layer — without
  // it the package's guard throws and the suite cannot import them at all.
  resolve: {
    conditions: ["react-server", "node", "import", "default"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server", "node", "import", "default"],
      externalConditions: ["react-server", "node", "import", "default"],
    },
  },
  test: {
    exclude: ["node_modules/**", "tests/e2e/**"],
  },
});

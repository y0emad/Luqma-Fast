import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"], // before every test file: test env, email mocks, DB connections
    fileParallelism: false,           // all files share one test database, run them one by one
    clearMocks: true,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});

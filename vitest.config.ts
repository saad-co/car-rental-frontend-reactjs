import { defineConfig } from "vitest/config";

// Unit tests for the plain-TypeScript logic of the vehicle-photo page (translations, flow, upload queue). No browser and no
// React: the files under test never touch the DOM, so the plain Node environment is enough.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "src/__tests__/mocks/**",
        "src/__tests__/fixtures.ts",
        "vitest.config.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@config": path.resolve(__dirname, "./src/config"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@routes": path.resolve(__dirname, "./src/routes"),
      "@middleware": path.resolve(__dirname, "./src/middleware"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});

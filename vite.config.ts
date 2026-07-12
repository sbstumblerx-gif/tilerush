import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Lisätään pakotettu reittien generointi päälle
  vite: {
    build: {
      sourcemap: false,
    }
  }
});

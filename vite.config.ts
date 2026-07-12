import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      sourcemap: false,
    },
    // Pakotetaan esbuild ohittamaan TypeScript-tyyppivirheet koodin generoinnissa
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          ignoreDeprecations: ["5.0"],
          noEmit: false,
          skipLibCheck: true
        }
      }
    }
  }
});

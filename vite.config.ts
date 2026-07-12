import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      sourcemap: false,
    },
    typescript: {
      // Tämä estää TanStack Startin kääntäjää kaatamasta buildia tyyppivirheisiin
      tsconfig: {
        compilerOptions: {
          skipLibCheck: true,
          noEmit: false,
        }
      }
    }
  }
});

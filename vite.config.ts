import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    mode === 'development' && TanStackRouterVite({
      autoCodeSplitting: true,
    }),
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      // Tämä sammuttaa Viten punaiset/ruskeat runtime error -ruudut,
      // jolloin Lovable ei jää jumiin vanhoihin välimuistivirheisiin.
      overlay: false,
    },
  },
}));

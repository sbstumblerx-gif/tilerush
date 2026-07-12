import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    mode === 'development' && TanStackRouterVite({
      // Estetään reittien lennosta luonti, jotta se ei yritä etsiä vanhoja tiedostoja
      autoGeneration: false,
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/appRouteTree.ts",
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
      // Estetään virheikkunan hyppääminen silmille vanhoista välimuisteista
      overlay: false,
    },
  },
}));

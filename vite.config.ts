import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // Varmistaa, että reitit rakennetaan suhteellisina nettilinkkiä varten
  base: "/",
  plugins: [
    tailwindcss(),
    react(),
    TanStackRouterVite({
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Pakotetaan reititys toimimaan SPA-moodissa kehityksessä ja julkaisussa
    historyApiFallback: true,
  },
});

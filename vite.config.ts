import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    // Otetaan reititin-plugini kokonaan pois, jotta se ei yritä skannata rikkinäisiä reittejä
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      overlay: false, // Estää virheilmoitusruudun hyppäämisen ruudulle
    },
  },
});

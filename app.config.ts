import { defineConfig } from '@tanstack/react-start/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  vite: {
    plugins: [
      tsconfigPaths(),
    ],
  },
  // Kerrotaan TanStack Startille, että käytetään sinun kansiorakennettasi
  routers: {
    client: {
      entry: './src/start.ts'
    },
    server: {
      entry: './src/server.ts'
    }
  }
})

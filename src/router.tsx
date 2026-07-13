import { createRouter as createTanStackRouter } from '@tanstack/react-router'
// Varmista että tämä import osoittaa tiedostoon, jossa reitit oikeasti ovat (esim. ./routeTree.gen)
import { routeTree } from './routeTree.gen'

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

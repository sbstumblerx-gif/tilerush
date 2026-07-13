import { createStartHandler, defaultRenderHandler } from '@tanstack/react-start/server'
import { createRouter } from './router'

// Luodaan standardi Start-käsittelijä, jota Vinxi osaa lukea
export default createStartHandler({
  createRouter,
  getRouterManifest: () => ({
    routes: {},
  }),
})(defaultRenderHandler)

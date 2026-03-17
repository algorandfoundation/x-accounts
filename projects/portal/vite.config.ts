import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      srcDirectory: 'app',
    }),
    // TanStack Start SSR routes don't hot-swap; force a full page reload instead
    {
      name: 'full-reload',
      handleHotUpdate({ server }) {
        server.ws.send({ type: 'full-reload' })
        return []
      },
    },
  ],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, 'app'),
    },
  },
})

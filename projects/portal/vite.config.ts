import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import path from 'node:path'

const root = import.meta.dirname

// Correct @tanstack/store paths — pnpm hoists 0.8.0 from use-wallet but
// @tanstack/react-router@1.167 needs 0.9.2 (has createStore/atom)
const tanstackStorePath = path.resolve(
  root,
  '../../node_modules/.pnpm/@tanstack+store@0.9.2/node_modules/@tanstack/store/dist/esm/index.js',
)
const tanstackReactStorePath = path.resolve(
  root,
  '../../node_modules/.pnpm/@tanstack+react-store@0.9.2_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/@tanstack/react-store/dist/esm/index.js',
)

// Real file shims for CJS packages (virtual modules break with /@fs/ served deps)
const shimDir = path.resolve(root, 'app/shims')

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      srcDirectory: 'app',
    }),
    // Fix CJS/ESM and version issues — scoped to client only
    {
      name: 'client-fixes',
      enforce: 'pre',
      resolveId(id, _importer, options) {
        if (options?.ssr) return
        try {
          if (this?.environment?.name === 'ssr') return
        } catch {
          // environment API unavailable in some Vite versions
        }
        if (id === '@tanstack/store') return { id: tanstackStorePath, external: false }
        if (id === '@tanstack/react-store') return { id: tanstackReactStorePath, external: false }
        // buffer is handled by optimizeDeps.include below — don't intercept it here
        if (
          id === 'use-sync-external-store/shim/with-selector' ||
          id === 'use-sync-external-store/shim/with-selector.js'
        )
          return { id: path.join(shimDir, 'use-sync-external-store-with-selector.js'), external: false }
        if (id === 'use-sync-external-store/shim' || id === 'use-sync-external-store/shim/index.js')
          return { id: path.join(shimDir, 'use-sync-external-store.js'), external: false }
      },
    },
    // TanStack Start SSR routes don't hot-swap; force a full page reload
    {
      name: 'full-reload',
      handleHotUpdate({ server }) {
        server.ws.send({ type: 'full-reload' })
        return []
      },
    },
  ],
  // Buffer global injection for wallet/bridge libs
  define: {
    global: 'globalThis',
  },
  // Pre-bundle the CJS buffer package so Vite converts it to ESM
  optimizeDeps: {
    include: ['buffer'],
  },
  resolve: {
    alias: {
      '~': path.resolve(root, 'app'),
    },
    dedupe: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@txnlab/use-wallet-react',
      'algosdk',
      '@algorandfoundation/algokit-utils',
      'wagmi',
      '@wagmi/core',
      'viem',
      '@rainbow-me/rainbowkit',
    ],
  },
})

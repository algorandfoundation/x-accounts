import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Stub for optional wallet SDKs that use-wallet dynamically imports
// but aren't needed when using RainbowKit instead of direct MetaMask
const stubPath = resolve(__dirname, 'src/stubs/empty.ts')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      '@metamask/sdk': stubPath,
    },
    dedupe: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@txnlab/use-wallet-react',
      'algosdk',
      '@algorandfoundation/algokit-utils',
      'liquid-accounts-evm',
    ],
  },
  optimizeDeps: {
    include: ['buffer'],
  },
})

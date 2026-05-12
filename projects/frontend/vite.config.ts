import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@txnlab/use-wallet-react",
      "algosdk",
      "@algorandfoundation/algokit-utils",
      "wagmi",
      "@wagmi/core",
      "viem",
      "@rainbow-me/rainbowkit",
    ],
  },
  optimizeDeps: {
    include: ["buffer"],
  },
})

// ESM wrapper for the buffer package.
// Vite's import rewriting turns `from 'buffer'` into this file,
// which provides Buffer via the browser-native base64 primitives
// used internally by the buffer polyfill.
//
// We inline a re-export from the buffer package's actual implementation
// by having Vite resolve the raw source (which it CAN handle as a
// transitive dep since it's already been pre-bundled or processed).

// The buffer package is CJS but algosdk and other deps already pull it
// into Vite's dep graph. Use the pre-bundled version if available.
let _Buffer

if (typeof globalThis !== "undefined" && globalThis.Buffer) {
  _Buffer = globalThis.Buffer
} else if (typeof window !== "undefined") {
  // Minimal Buffer polyfill for the operations wallet libs need
  // (from/alloc/isBuffer/toString for base64/hex encoding)
  const { Buffer: B } = await import(
    /* @vite-ignore */
    "/node_modules/.vite/deps/buffer.js"
  )
  _Buffer = B
  globalThis.Buffer = B
}

export const Buffer = _Buffer
export default { Buffer: _Buffer }

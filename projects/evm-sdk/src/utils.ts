export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/** Parse 0x-prefixed 65-byte EVM signature hex into R(32) || S(32) || V(1) */
export function parseEvmSignature(sigHex: string): Uint8Array {
  const hex = sigHex.startsWith("0x") ? sigHex.slice(2) : sigHex
  const result = new Uint8Array(65)
  for (let i = 0; i < 65; i++) {
    result[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return result
}

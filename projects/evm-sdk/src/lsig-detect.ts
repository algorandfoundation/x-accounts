import {
  LSIG_OWNER_LENGTH,
  LSIG_OWNER_OFFSET,
  LSIG_TEMPLATE_BASE64,
  LSIG_TEMPLATE_LENGTH,
} from './generated/lsig-template'
import { base64ToBytes, bytesToHex } from './utils'

const TEMPLATE_BYTES = base64ToBytes(LSIG_TEMPLATE_BASE64)

/**
 * Pattern-match a compiled lsig program against the xChain EVM lsig template.
 * Returns the embedded 0x-prefixed lowercase EVM address (42 chars) if the
 * program matches the template byte-for-byte except in the OWNER slot,
 * otherwise null.
 *
 * Synchronous and algod-free — uses the build-time-pinned template.
 */
export function getEvmAddressFromProgram(program: Uint8Array): `0x${string}` | null {
  if (program.length !== LSIG_TEMPLATE_LENGTH) return null
  const ownerEnd = LSIG_OWNER_OFFSET + LSIG_OWNER_LENGTH
  for (let i = 0; i < program.length; i++) {
    if (i >= LSIG_OWNER_OFFSET && i < ownerEnd) continue
    if (program[i] !== TEMPLATE_BYTES[i]) return null
  }
  return bytesToHex(program.subarray(LSIG_OWNER_OFFSET, ownerEnd))
}

/** True iff the program matches the xChain EVM lsig template. */
export function isXChainLsigProgram(program: Uint8Array): boolean {
  return getEvmAddressFromProgram(program) !== null
}

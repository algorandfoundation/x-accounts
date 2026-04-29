import type { AlgorandClient } from "@algorandfoundation/algokit-utils"
import algosdk from "algosdk"
import { ALGO_X_EVM_LSIG_TEAL } from "./generated/teal"
import { getEvmAddressFromProgram } from "./lsig-detect"
import {
  SignTypedDataParams,
  buildTypedData,
  hexToBytes,
  parseEvmSignature,
} from "./utils"
export {
  ALGORAND_CHAIN_ID,
  ALGORAND_CHAIN_ID_HEX,
  ALGORAND_EVM_CHAIN_CONFIG,
  algorandChain,
  EIP712_DOMAIN,
  EIP712_TYPES,
  EVM_LSIG_TYPE,
  buildTypedData,
  formatEIP712Message,
  hexToBytes,
  parseEvmSignature,
} from "./utils"
export type { SignTypedDataParams } from "./utils"
export { getEvmAddressFromProgram, isXChainLsigProgram } from "./lsig-detect"

export class AlgoXEvmSdk {
  private algorand: AlgorandClient
  private compiledCache = new Map<string, Uint8Array>()

  constructor({ algorand }: { algorand: AlgorandClient }) {
    this.algorand = algorand
  }

  private static normalizeAddress(evmAddress: string): string {
    return evmAddress.startsWith("0x") ? evmAddress.slice(2).toLowerCase() : evmAddress.toLowerCase()
  }

  private async getCompiled(evmAddress: string): Promise<Uint8Array> {
    const normalized = AlgoXEvmSdk.normalizeAddress(evmAddress)
    if (!this.compiledCache.has(normalized)) {
      const result = await this.algorand.app.compileTealTemplate(ALGO_X_EVM_LSIG_TEAL, {
        TMPL_OWNER: hexToBytes(normalized),
      })
      this.compiledCache.set(normalized, result.compiledBase64ToBytes)
      return result.compiledBase64ToBytes
    }
    return this.compiledCache.get(normalized)!
  }

  /** Get Algorand address for a given EVM address (hex, with or without 0x prefix) */
  async getAddress({ evmAddress }: { evmAddress: string }): Promise<string> {
    const compiled = await this.getCompiled(evmAddress)
    const lsig = new algosdk.LogicSigAccount(compiled, [])
    return lsig.address().toString()
  }

  /**
   * Detect whether a compiled lsig program is an xChain EVM lsig and extract the
   * embedded EVM owner address. Returns 0x-prefixed lowercase hex (42 chars), or null.
   *
   * Synchronous and algod-free — uses a build-time-pinned lsig template.
   */
  static getEvmAddressFromProgram(program: Uint8Array): `0x${string}` | null {
    return getEvmAddressFromProgram(program)
  }

  /** Convenience wrapper that accepts an algosdk LogicSig or LogicSigAccount. */
  static getEvmAddressFromLsig(
    lsig: algosdk.LogicSig | algosdk.LogicSigAccount,
  ): `0x${string}` | null {
    const program = lsig instanceof algosdk.LogicSigAccount ? lsig.lsig.logic : lsig.logic
    return getEvmAddressFromProgram(program)
  }

  /**
   * Look up an Algorand account's most recent lsig-bearing transaction via the indexer
   * and, if the lsig matches the xChain template, return the embedded EVM address.
   *
   * Returns null if no matching lsig transaction is found within the search window.
   *
   * Note: lsig programs are not stored per-account on Algorand — they are only
   * persisted in transaction history. Accounts that have never sent a transaction
   * cannot be detected this way.
   *
   * @param algorandAddress - 58-character Algorand address to inspect
   * @param limit - max number of recent sender-side transactions to scan (default 1)
   */
  async getEvmAddressFromAccount({
    algorandAddress,
    limit = 1,
  }: {
    algorandAddress: string
    limit?: number
  }): Promise<`0x${string}` | null> {
    const indexer = this.algorand.client.indexer
    const result = await indexer
      .searchForTransactions()
      .address(algorandAddress)
      .addressRole("sender")
      .limit(limit)
      .do()
    for (const txn of result.transactions ?? []) {
      const program = txn.signature?.logicsig?.logic
      if (!program) continue
      const evm = getEvmAddressFromProgram(program)
      if (evm) return evm
    }
    return null
  }

  /** Get the payload for the EVM wallet to sign. Group ID if group.length > 1, otherwise Txn ID */
  static getSignPayload(txnGroup: algosdk.Transaction[]): Uint8Array {
    if (txnGroup.length === 0) {
      throw new Error("Cannot get sign payload from empty transaction group")
    }
    // For grouped txns of more than 1, sign the group ID; for standalone sign the txn ID
    return txnGroup.length > 1 ? txnGroup[0].group! : txnGroup[0].rawTxID()
  }

  /**
   * Sign one or more algosdk Transactions with the EVM lsig using EIP-712 typed data.
   *
   * The payload signed by the EVM wallet is:
   * - The group ID if `txns[0].group` is set
   * - The transaction ID otherwise (only valid when `txns` has exactly one element)
   *
   * @param evmAddress - hex EVM address (with or without 0x prefix)
   * @param txns - algosdk Transaction(s) to sign (must already have group ID assigned if grouped)
   * @param signMessage - callback that receives the full EIP-712 typed data (domain, types,
   *   primaryType, message) and should return the signature. Pass the typed data directly to
   *   `eth_signTypedData_v4` or `signTypedData`.
   * @returns array of signed transaction blobs (Uint8Array[])
   *
   * @example
   * ```typescript
   * import type { SignTypedDataParams } from "algo-x-evm-sdk"
   *
   * // With ethers.js
   * const signMessage = async ({ domain, types, message }: SignTypedDataParams) => {
   *   return wallet.signTypedData(domain, types, message)
   * }
   *
   * const signed = await sdk.signTxn({ evmAddress, txns, signMessage })
   * ```
   */
  async signTxn(params: {
    evmAddress: string
    txns: algosdk.Transaction[]
    signMessage: (typedData: SignTypedDataParams) => Promise<string>
  }): Promise<Uint8Array[]>

  /**
   * Sign one or more algosdk Transactions with the EVM lsig using a pre-computed signature.
   *
   * Use this variant when you already have the EIP-712 signature for the transaction/group ID.
   *
   * @param evmAddress - hex EVM address (with or without 0x prefix)
   * @param txns - algosdk Transaction(s) to sign (must already have group ID assigned if grouped)
   * @param signature - pre-computed EIP-712 signature (0x-prefixed 65-byte hex string)
   * @returns array of signed transaction blobs (Uint8Array[])
   *
   * @example
   * ```typescript
   * const payload = AlgoXEvmSdk.getSignPayload(txns)
   * const typedData = buildTypedData(payload)
   * const signature = await wallet.signTypedData(typedData.domain, typedData.types, typedData.message)
   *
   * const signed = await sdk.signTxn({ evmAddress, txns, signature })
   * ```
   */
  async signTxn(params: {
    evmAddress: string
    txns: algosdk.Transaction[]
    signature: string
  }): Promise<Uint8Array[]>

  async signTxn({
    evmAddress,
    txns,
    signMessage,
    signature,
  }: {
    evmAddress: string
    txns: algosdk.Transaction[]
    signMessage?: (typedData: SignTypedDataParams) => Promise<string>
    signature?: string
  }): Promise<Uint8Array[]> {
    const compiled = await this.getCompiled(evmAddress)

    let evmSig: string
    if (signature) {
      evmSig = signature
    } else if (signMessage) {
      const payload = AlgoXEvmSdk.getSignPayload(txns)
      evmSig = await signMessage(buildTypedData(payload))
    } else {
      throw new Error("Either signMessage or signature must be provided")
    }

    const sigBytes = parseEvmSignature(evmSig)
    const lsig = new algosdk.LogicSigAccount(compiled, [sigBytes])

    return txns.map((txn) => algosdk.signLogicSigTransactionObject(txn, lsig).blob)
  }

  /**
   * Get an algokit-utils compatible TransactionSigner for the given EVM address using EIP-712 typed data signing.
   *
   * @param evmAddress - hex EVM address (with or without 0x prefix)
   * @param signMessage - callback that receives the full EIP-712 typed data (domain, types,
   *   primaryType, message) and should return the signature. Pass the typed data directly to
   *   `eth_signTypedData_v4` or `signTypedData`.
   * @returns `{ addr, signer }` — pass directly as `sender` + `signer` to algokit-utils methods
   *
   * @example
   * ```typescript
   * import type { SignTypedDataParams } from "algo-x-evm-sdk"
   *
   * const signMessage = async ({ domain, types, message }: SignTypedDataParams) => {
   *   return wallet.signTypedData(domain, types, message)
   * }
   *
   * const { addr, signer } = await sdk.getSigner({ evmAddress, signMessage })
   * ```
   */
  async getSigner({
    evmAddress,
    signMessage,
  }: {
    evmAddress: string
    signMessage: (typedData: SignTypedDataParams) => Promise<string>
  }): Promise<{ addr: string; signer: algosdk.TransactionSigner }> {
    const compiled = await this.getCompiled(evmAddress)
    const lsig = new algosdk.LogicSigAccount(compiled, [])
    const addr = lsig.address().toString()

    const signer: algosdk.TransactionSigner = async (txnGroup, indexesToSign) => {
      // Get the payload (group ID for grouped txns, txn ID for standalone)
      const payload = AlgoXEvmSdk.getSignPayload(txnGroup)

      const evmSig = await signMessage(buildTypedData(payload))
      const sigBytes = parseEvmSignature(evmSig)
      const signedLsig = new algosdk.LogicSigAccount(compiled, [sigBytes])

      return indexesToSign.map((i) => algosdk.signLogicSigTransactionObject(txnGroup[i], signedLsig).blob)
    }

    return { addr, signer }
  }
}

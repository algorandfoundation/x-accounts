import type { AlgorandClient } from "@algorandfoundation/algokit-utils"
import algosdk from "algosdk"
import { ALGO_FUNDING_LSIG_TEAL } from "./teal"
import { hexToBytes, parseEvmSignature } from "./utils"
export { hexToBytes, parseEvmSignature } from "./utils"

export class LiquidEvmSdk {
  private algorand: AlgorandClient
  private compiledCache = new Map<string, Uint8Array>()

  constructor({ algorand }: { algorand: AlgorandClient }) {
    this.algorand = algorand
  }

  private static normalizeAddress(evmAddress: string): string {
    return evmAddress.startsWith("0x") ? evmAddress.slice(2).toLowerCase() : evmAddress.toLowerCase()
  }

  private async getCompiled(evmAddress: string): Promise<Uint8Array> {
    const normalized = LiquidEvmSdk.normalizeAddress(evmAddress)
    if (!this.compiledCache.has(normalized)) {
      const result = await this.algorand.app.compileTealTemplate(ALGO_FUNDING_LSIG_TEAL, {
        TMPL_OWNER: hexToBytes(normalized),
      })
      this.compiledCache.set(normalized, result.compiledBase64ToBytes)
    }
    return this.compiledCache.get(normalized)!
  }

  /** Get Algorand address for a given EVM address (hex, with or without 0x prefix) */
  async getAddress({ evmAddress }: { evmAddress: string }): Promise<string> {
    const compiled = await this.getCompiled(evmAddress)
    const lsig = new algosdk.LogicSigAccount(compiled, [])
    return lsig.address().toString()
  }

  private getSignPayload(txnGroup: algosdk.Transaction[]): Uint8Array {
    // For grouped txns of more than 1, sign the group ID; for standalone sign the txn ID
    return txnGroup.length > 1 ? txnGroup[0].group! : txnGroup[0].rawTxID()
  }

  /**
   * Get an algokit-utils compatible TransactionSigner for the given EVM address.
   *
   * @param evmAddress - hex EVM address (with or without 0x prefix)
   * @param signMessage - callback that signs a raw Uint8Array message with the EVM wallet
   *   (e.g. `personal_sign`). Must return a 0x-prefixed 65-byte hex signature.
   * @returns `{ addr, signer }` — pass directly as `sender` + `signer` to algokit-utils methods
   */
  async getSigner({
    evmAddress,
    signMessage,
  }: {
    evmAddress: string
    signMessage: (message: Uint8Array) => Promise<string>
  }): Promise<{ addr: string; signer: algosdk.TransactionSigner }> {
    const compiled = await this.getCompiled(evmAddress)
    const lsig = new algosdk.LogicSigAccount(compiled, [])
    const addr = lsig.address().toString()

    const signer: algosdk.TransactionSigner = async (txnGroup, indexesToSign) => {
      // For grouped txns sign the group ID; for standalone sign the txn ID
      const payload = this.getSignPayload(txnGroup)

      const evmSig = await signMessage(payload)
      const sigBytes = parseEvmSignature(evmSig)
      const signedLsig = new algosdk.LogicSigAccount(compiled, [sigBytes])

      return indexesToSign.map((i) => algosdk.signLogicSigTransactionObject(txnGroup[i], signedLsig).blob)
    }

    return { addr, signer }
  }

  /**
   * Sign one or more algosdk Transactions with the EVM lsig.
   *
   * The payload signed by the EVM wallet is:
   * - The group ID if `txns[0].group` is set
   * - The transaction ID otherwise (only valid when `txns` has exactly one element)
   *
   * @param evmAddress - hex EVM address (with or without 0x prefix)
   * @param txns - algosdk Transaction(s) to sign (must already have group ID assigned if grouped)
   * @param signMessage - callback that signs a raw Uint8Array with the EVM wallet
   * @returns array of signed transaction blobs (Uint8Array[])
   */
  async signTxn({
    evmAddress,
    txns,
    signMessage,
  }: {
    evmAddress: string
    txns: algosdk.Transaction[]
    signMessage: (message: Uint8Array) => Promise<string>
  }): Promise<Uint8Array[]> {
    const compiled = await this.getCompiled(evmAddress)

    const payload = this.getSignPayload(txns)

    const evmSig = await signMessage(payload)
    const sigBytes = parseEvmSignature(evmSig)
    const lsig = new algosdk.LogicSigAccount(compiled, [sigBytes])

    return txns.map((txn) => algosdk.signLogicSigTransactionObject(txn, lsig).blob)
  }
}

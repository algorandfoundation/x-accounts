/**
 * @module avm-x-evm
 */
import type { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import { LIQUID_EVM_LSIG_TEAL } from "./teal.ts";
import {
  type SignTypedDataParams,
  buildTypedData,
  hexToBytes,
  parseEvmSignature,
  isTxnsWithSignature,
  isTxnsWithSignMessage,
} from "./utils.ts";
import type { TxnsWithSignature, TxnsWithSignMessage } from "./types.ts";
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
} from "./utils.ts";
export type { SignTypedDataParams } from "./utils.ts";
export type { TxnsWithSignature, TxnsWithSignMessage } from "./types.ts";

/**
 * A utility class for integrating Ethereum Virtual Machine (EVM) functionalities with the Algorand blockchain.
 * Provides methods for interacting with Ethereum addresses, signing transactions, and generating compatible payloads.
 *
 * This SDK enables "Liquid Accounts" on Algorand, allowing EVM wallets (like MetaMask) to sign Algorand transactions
 * using EIP-712 typed data.
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-712 | EIP-712: Typed structured data hashing and signing}
 */
export class LiquidEvmSdk {
  private algorand: AlgorandClient
  private compiledCache = new Map<string, Uint8Array>()

  /**
   * Create a new LiquidEvmSdk instance.
   * @param params - The initialization parameters.
   * @param params.algorand - An instance of {@link AlgorandClient} to interact with the Algorand network.
   */
  constructor({ algorand }: { algorand: AlgorandClient }) {
    this.algorand = algorand
  }

  /**
   * Normalizes an Ethereum address by converting it to lowercase and removing the "0x" prefix if present.
   *
   * @param evmAddress The Ethereum address to be normalized.
   * @return The normalized Ethereum address as a lowercase string without the "0x" prefix.
   */
  private static normalizeAddress(evmAddress: string): string {
    return evmAddress.startsWith('0x') ? evmAddress.slice(2).toLowerCase() : evmAddress.toLowerCase()
  }

  /**
   * Fetches and returns the compiled TEAL template for the given EVM address.
   * If the address is not already cached, it normalizes the EVM address, compiles
   * the TEAL template, and caches the result for future use.
   *
   * @param {string} evmAddress - The Ethereum Virtual Machine (EVM) address to be used for compilation.
   * @return {Promise<Uint8Array>} A promise that resolves to the compiled TEAL template as a Uint8Array.
   */
  private async getCompiled(evmAddress: string): Promise<Uint8Array> {
    const normalized = LiquidEvmSdk.normalizeAddress(evmAddress)
    if (!this.compiledCache.has(normalized)) {
      const result = await this.algorand.app.compileTealTemplate(LIQUID_EVM_LSIG_TEAL, {
        TMPL_OWNER: hexToBytes(normalized),
      })
      this.compiledCache.set(normalized, result.compiledBase64ToBytes)
    }
    return this.compiledCache.get(normalized)!
  }

  /**
   * Retrieves the Algorand address associated with the given EVM address.
   * This is done by injecting the EVM address into a TEAL template and compiling it to a LogicSig address.
   *
   * @param params - The parameter object.
   * @param params.evmAddress - The 0x-prefixed or non-prefixed hex EVM address.
   * @returns The generated Algorand address as a string.
   */
  async getAddress({ evmAddress }: { evmAddress: string }): Promise<string> {
    const compiled = await this.getCompiled(evmAddress)
    const lsig = new algosdk.LogicSigAccount(compiled, [])
    return lsig.address().toString()
  }

  /**
   * Generates the 32-byte payload to be signed for a transaction group or a standalone transaction.
   * For grouped transactions, this is the Group ID. For standalone transactions, it is the Transaction ID.
   *
   * @param txnGroup - An array of {@link algosdk.Transaction} objects.
   * @returns The 32-byte payload (Group ID or Transaction ID) as a Uint8Array.
   * @throws {Error} If the transaction group is empty.
   */
  static getSignPayload(txnGroup: algosdk.Transaction[]): Uint8Array {
    if (txnGroup.length === 0) {
      throw new Error('Cannot get sign payload from empty transaction group')
    }
    // For grouped txns of more than 1, sign the group ID; for standalone sign the txn ID
    return txnGroup.length > 1 ? txnGroup[0].group! : txnGroup[0].rawTxID()
  }

  /**
   * Sign one or more Algorand transactions with the EVM LogicSig.
   *
   * This method supports two ways of signing:
   * 1. Providing a pre-computed EIP-712 signature.
   * 2. Providing a `signMessage` callback that will be called with the EIP-712 typed data.
   *
   * @param params - The signing parameters, either {@link TxnsWithSignature} or {@link TxnsWithSignMessage}.
   * @returns A promise that resolves to an array of signed transaction blobs (Uint8Array[]).
   *
   * @example
   * ```typescript
   * const payload = LiquidEvmSdk.getSignPayload(txns)
   * const typedData = buildTypedData(payload)
   * const signature = await wallet.signTypedData(typedData.domain, typedData.types, typedData.message)
   *
   * const signed = await sdk.signTxn({ evmAddress, txns, signature })
   * ```
   *
   * @example
   * ```typescript
   * import type { SignTypedDataParams } from "avm-x-evm"
   *
   * // With ethers.js
   * const signMessage = async ({ domain, types, message }: SignTypedDataParams) => {
   *   return wallet.signTypedData(domain, types, message)
   * }
   *
   * const signed = await sdk.signTxn({ evmAddress, txns, signMessage })
   * ```
   */
  async signTxn(params: TxnsWithSignature | TxnsWithSignMessage): Promise<Uint8Array[]> {
    const { evmAddress, txns } = params
    const compiled = await this.getCompiled(evmAddress)

    let evmSig: string
    if (isTxnsWithSignature(params)) {
      evmSig = params.signature
    } else if (isTxnsWithSignMessage(params)) {
      const payload = LiquidEvmSdk.getSignPayload(txns)
      evmSig = await params.signMessage(buildTypedData(payload))
    } else {
      throw new Error('Either signMessage or signature must be provided')
    }

    const sigBytes = parseEvmSignature(evmSig)
    const lsig = new algosdk.LogicSigAccount(compiled, [sigBytes])

    return txns.map((txn) => algosdk.signLogicSigTransactionObject(txn, lsig).blob)
  }

  /**
   * Retrieves a {@link algosdk.TransactionSigner} interface and address for signing Algorand transactions
   * using a provided EVM-compatible address and signing function.
   *
   * @param params - The parameters for obtaining the signer.
   * @param params.evmAddress - The EVM-compatible address to derive the Algorand address from.
   * @param params.signMessage - A function that receives {@link SignTypedDataParams} and returns an EIP-712 signature string.
   *
   * @returns A promise that resolves to an object containing:
   * - `addr`: The derived Algorand address.
   * - `signer`: A {@link algosdk.TransactionSigner} that uses the provided EVM signing mechanism.
   *
   * @example
   * ```typescript
   * import type { SignTypedDataParams } from "avm-x-evm"
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
      const payload = LiquidEvmSdk.getSignPayload(txnGroup)

      const evmSig = await signMessage(buildTypedData(payload))
      const sigBytes = parseEvmSignature(evmSig)
      const signedLsig = new algosdk.LogicSigAccount(compiled, [sigBytes])

      return indexesToSign.map((i) => algosdk.signLogicSigTransactionObject(txnGroup[i], signedLsig).blob)
    }

    return { addr, signer }
  }
}

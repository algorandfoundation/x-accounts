import { Config } from "@algorandfoundation/algokit-utils"
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug"
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing"
import algosdk from "algosdk"
import { ethers } from "ethers"
import { AlgoXEvmSdk, buildTypedData } from "algo-x-evm-sdk"
import type { SignTypedDataParams } from "algo-x-evm-sdk"
import { beforeAll, beforeEach, describe, expect, test } from "vitest"

// Fixed EVM test wallet (DO NOT use in production)
const EVM_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const evmWallet = new ethers.Wallet(EVM_PRIVATE_KEY)
const CORRECT_ETH_ACCOUNT = evmWallet.address
const WRONG_ETH_ACCOUNT = "0x0000000000000000000000000000000000000000"

// EIP-712 signing helper - receives typed data from SDK and signs
// ethers.js v6 derives EIP712Domain from the domain parameter, so strip it from types
const signMessage = async ({ domain, types, message }: SignTypedDataParams) => {
  const { EIP712Domain: _, ...signingTypes } = types
  return evmWallet.signTypedData(domain, signingTypes, message)
}

describe("LogicSig EVM signature validation", () => {
  const localnet = algorandFixture()
  beforeAll(() => {
    Config.configure({
      // debug: true
    })
    registerDebugEventHandlers()
  })
  beforeEach(localnet.newScope)

  describe("standalone transaction (TxID)", () => {
    test("approves when signature matches the templated EVM account", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const { addr, signer } = await sdk.getSigner({ evmAddress: CORRECT_ETH_ACCOUNT, signMessage })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      await algorand.send.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
        signer,
      })
    })

    test("rejects when templated EVM account does not match signer", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const { addr, signer } = await sdk.getSigner({ evmAddress: WRONG_ETH_ACCOUNT, signMessage })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      await expect(
        algorand.send.payment({
          sender: addr,
          receiver: addr,
          amount: (0).algos(),
          validityWindow: 100,
          signer,
        }),
      ).rejects.toThrow()
    })
  })

  describe("single transaction, grouped (Group ID)", () => {
    test("approves when signature matches the templated EVM account", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signMessage,
      })

      await algorand.client.algod.sendRawTransaction(signed).do()
    })

    test("approves when using pre-computed signature", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Pre-compute the signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const signature = await signMessage(buildTypedData(payload))

      // Sign using pre-computed signature
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature,
      })

      await algorand.client.algod.sendRawTransaction(signed).do()
    })

    test("rejects when templated EVM account does not match signer", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: WRONG_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      const [signed] = await sdk.signTxn({
        evmAddress: WRONG_ETH_ACCOUNT,
        txns: [gtxn],
        signMessage,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })
  })

  describe("grouped transactions (Group ID)", () => {
    test("approves when signature matches the templated EVM account", async () => {
      const { algorand, testAccount } = localnet.context
      const sdk = new AlgoXEvmSdk({ algorand })
      const { addr, signer } = await sdk.getSigner({ evmAddress: CORRECT_ETH_ACCOUNT, signMessage })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      await algorand
        .newGroup()
        .addPayment({
          sender: addr,
          receiver: addr,
          amount: (0).algos(),
          validityWindow: 100,
          signer,
        })
        .addPayment({
          sender: testAccount.addr,
          receiver: testAccount.addr,
          amount: (0).algos(),
          validityWindow: 100,
        })
        .send()
    })

    test("rejects when templated EVM account does not match signer", async () => {
      const { algorand, testAccount } = localnet.context
      const sdk = new AlgoXEvmSdk({ algorand })
      const { addr, signer } = await sdk.getSigner({ evmAddress: WRONG_ETH_ACCOUNT, signMessage })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      await expect(
        algorand
          .newGroup()
          .addPayment({
            sender: addr,
            receiver: addr,
            amount: (0).algos(),
            validityWindow: 100,
            signer,
          })
          .addPayment({
            sender: testAccount.addr,
            receiver: testAccount.addr,
            amount: (0).algos(),
            validityWindow: 100,
          })
          .send(),
      ).rejects.toThrow()
    })
  })

  describe("invalid signature components", () => {
    test("rejects when R is invalid (zero)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Parse signature
      const sigBytes = new Uint8Array(65)
      const hex = validSig.startsWith("0x") ? validSig.slice(2) : validSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Mutate R to all zeros (invalid)
      for (let i = 0; i < 32; i++) {
        sigBytes[i] = 0
      }

      const invalidSig =
        "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail during ECDSA recovery
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when R is invalid (exceeds curve order)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Parse signature
      const sigBytes = new Uint8Array(65)
      const hex = validSig.startsWith("0x") ? validSig.slice(2) : validSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Mutate R to all 0xFF (exceeds secp256k1 curve order)
      for (let i = 0; i < 32; i++) {
        sigBytes[i] = 0xff
      }

      const invalidSig =
        "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail during ECDSA recovery
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when S is invalid (zero)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Parse signature
      const sigBytes = new Uint8Array(65)
      const hex = validSig.startsWith("0x") ? validSig.slice(2) : validSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Mutate S to all zeros (invalid)
      for (let i = 32; i < 64; i++) {
        sigBytes[i] = 0
      }

      const invalidSig =
        "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail during ECDSA recovery
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when S is invalid (exceeds curve order)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Parse signature
      const sigBytes = new Uint8Array(65)
      const hex = validSig.startsWith("0x") ? validSig.slice(2) : validSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Mutate S to all 0xFF (exceeds secp256k1 curve order)
      for (let i = 32; i < 64; i++) {
        sigBytes[i] = 0xff
      }

      const invalidSig =
        "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail during ECDSA recovery
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when V is invalid (not 27 or 28)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Parse signature
      const sigBytes = new Uint8Array(65)
      const hex = validSig.startsWith("0x") ? validSig.slice(2) : validSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Mutate V to invalid value (not 27 or 28)
      sigBytes[64] = 29

      const invalidSig =
        "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail - invalid recovery ID after subtraction (29 - 27 = 2, valid is 0 or 1)
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when V is flipped (wrong recovery ID)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Parse signature
      const sigBytes = new Uint8Array(65)
      const hex = validSig.startsWith("0x") ? validSig.slice(2) : validSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Flip V (27 <-> 28) to use wrong recovery ID
      const v = sigBytes[64]
      sigBytes[64] = v === 27 ? 28 : 27

      const invalidSig =
        "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail - recovers different public key, address won't match
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when signature is completely random", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Create completely random signature
      const randomSig = new Uint8Array(65)
      for (let i = 0; i < 65; i++) {
        randomSig[i] = Math.floor(Math.random() * 256)
      }
      // Set V to valid value to avoid early rejection
      randomSig[64] = 27

      const invalidSig =
        "0x" +
        Array.from(randomSig)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      // Should fail - invalid signature
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: invalidSig,
      })

      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })

    test("rejects when signature length is incorrect (truncated)", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a valid signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const validSig = await signMessage(buildTypedData(payload))

      // Truncate signature (remove last 4 hex chars = 2 bytes)
      // SDK will parse and zero-pad, resulting in invalid signature
      const truncatedSig = validSig.slice(0, -4)

      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: truncatedSig,
      })

      // Should fail on-chain - invalid signature (zero-padded)
      await expect(algorand.client.algod.sendRawTransaction(signed).do()).rejects.toThrow()
    })
  })

  describe("lower-S signature normalization", () => {
    test("normalizes upper-S signature to lower-S", async () => {
      const { algorand } = localnet
      const sdk = new AlgoXEvmSdk({ algorand })
      const addr = await sdk.getAddress({ evmAddress: CORRECT_ETH_ACCOUNT })

      await algorand.account.ensureFundedFromEnvironment(addr, (1).algos())

      const txn = await algorand.createTransaction.payment({
        sender: addr,
        receiver: addr,
        amount: (0).algos(),
        validityWindow: 100,
      })
      const [gtxn] = algosdk.assignGroupID([txn])

      // Get a normal signature
      const payload = AlgoXEvmSdk.getSignPayload([gtxn])
      const normalSig = await signMessage(buildTypedData(payload))

      // Parse and extract s value
      const sigBytes = new Uint8Array(65)
      const hex = normalSig.startsWith("0x") ? normalSig.slice(2) : normalSig
      for (let i = 0; i < 65; i++) {
        sigBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
      }

      // Extract s and check if we need to flip it to upper-S
      const sBytes = sigBytes.slice(32, 64)
      let s = 0n
      for (let i = 0; i < 32; i++) {
        s = (s << 8n) | BigInt(sBytes[i])
      }

      const SECP256K1_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141")
      const SECP256K1_HALF_N = SECP256K1_N / 2n

      // If s is already upper-S, use it; otherwise flip to upper-S for testing
      let upperSSig: string
      if (s > SECP256K1_HALF_N) {
        upperSSig = normalSig
      } else {
        // Create upper-S by flipping s to n - s
        const upperS = SECP256K1_N - s
        const upperSBytes = new Uint8Array(65)
        upperSBytes.set(sigBytes.slice(0, 32), 0) // Copy r

        // Write upper s
        let tempS = upperS
        for (let i = 31; i >= 0; i--) {
          upperSBytes[32 + i] = Number(tempS & 0xffn)
          tempS >>= 8n
        }

        // Flip v
        const v = sigBytes[64]
        upperSBytes[64] = v === 27 ? 28 : 27

        upperSSig =
          "0x" +
          Array.from(upperSBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
      }

      // Verify that we have an upper-S signature for testing
      const upperSigBytes = new Uint8Array(65)
      const upperHex = upperSSig.startsWith("0x") ? upperSSig.slice(2) : upperSSig
      for (let i = 0; i < 65; i++) {
        upperSigBytes[i] = parseInt(upperHex.substring(i * 2, i * 2 + 2), 16)
      }

      const upperSBytes = upperSigBytes.slice(32, 64)
      let upperS = 0n
      for (let i = 0; i < 32; i++) {
        upperS = (upperS << 8n) | BigInt(upperSBytes[i])
      }

      // Assert that S is in upper half (> n/2)
      expect(upperS).toBeGreaterThan(SECP256K1_HALF_N)

      // SDK should normalize upper-S to lower-S and transaction should succeed
      const [signed] = await sdk.signTxn({
        evmAddress: CORRECT_ETH_ACCOUNT,
        txns: [gtxn],
        signature: upperSSig,
      })

      await algorand.client.algod.sendRawTransaction(signed).do()
    })
  })
})

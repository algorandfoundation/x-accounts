import { Config } from '@algorandfoundation/algokit-utils'
import { registerDebugEventHandlers } from '@algorandfoundation/algokit-utils-debug'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import algosdk from 'algosdk'
import { ethers } from 'ethers'
import { LiquidEvmSdk } from 'liquid-accounts-evm'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'

// Fixed EVM test wallet (DO NOT use in production)
const EVM_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const evmWallet = new ethers.Wallet(EVM_PRIVATE_KEY)
const CORRECT_ETH_ACCOUNT = evmWallet.address
const WRONG_ETH_ACCOUNT = '0x0000000000000000000000000000000000000000'

const signMessage = (msg: Uint8Array) => evmWallet.signMessage(msg)

describe('LogicSig EVM signature validation', () => {
  const localnet = algorandFixture()
  beforeAll(() => {
    Config.configure({
      // debug: true
    })
    registerDebugEventHandlers()
  })
  beforeEach(localnet.newScope)

  describe('standalone transaction (TxID)', () => {
    test('approves when signature matches the templated EVM account', async () => {
      const { algorand } = localnet
      const sdk = new LiquidEvmSdk({ algorand })
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

    test('rejects when templated EVM account does not match signer', async () => {
      const { algorand } = localnet
      const sdk = new LiquidEvmSdk({ algorand })
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

  describe('single transaction, grouped (Group ID)', () => {
    test('approves when signature matches the templated EVM account', async () => {
      const { algorand } = localnet
      const sdk = new LiquidEvmSdk({ algorand })
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

    test('rejects when templated EVM account does not match signer', async () => {
      const { algorand } = localnet
      const sdk = new LiquidEvmSdk({ algorand })
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

  describe('grouped transactions (Group ID)', () => {
    test('approves when signature matches the templated EVM account', async () => {
      const { algorand, testAccount } = localnet.context
      const sdk = new LiquidEvmSdk({ algorand })
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

    test('rejects when templated EVM account does not match signer', async () => {
      const { algorand, testAccount } = localnet.context
      const sdk = new LiquidEvmSdk({ algorand })
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
})

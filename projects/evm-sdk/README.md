# liquid-accounts-evm

Use EVM wallets (MetaMask, etc.) to sign and send Algorand transactions.

The SDK compiles a per-address [logic signature](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/smartsigs/) that validates EVM (secp256k1) signatures on-chain using the AVM's native `ecdsa_pk_recover` and `keccak256` opcodes. Each EVM address maps deterministically to an Algorand lsig address that only that EVM private key can authorize.

## Install

```bash
npm install liquid-accounts-evm
```

Peer dependencies:

```bash
npm install @algorandfoundation/algokit-utils algosdk
```

## How it works

```
Algorand dApp                  EVM Wallet                     Algorand
─────────────                  ───────────                    ────────
1. Build Algorand txn
                               2. personal_sign(txnId)
3. Submit txn + lsig + sig ──────────────────────────────►  4. AVM recovers signer from sig
                                                             5. Checks recovered address == templated owner
                                                             6. Transaction executes
```

The logic signature:

1. Takes the transaction ID (or group ID for atomic groups) as the payload
2. Reads the EVM signature from `arg[0]` (65 bytes: R || S || V)
3. Computes `keccak256("\x19Ethereum Signed Message:\n32" + payload)` (Ethereum `personal_sign` format)
4. Recovers the signer's public key via `ecdsa_pk_recover` (secp256k1)
5. Derives the Ethereum address: `keccak256(pubkeyX || pubkeyY)[12:32]`
6. Approves if the recovered address matches the templated owner

## Usage

### Setup

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { LiquidEvmSdk } from "liquid-accounts-evm"

const algorand = AlgorandClient.fromEnvironment()
const sdk = new LiquidEvmSdk({ algorand })

const evmAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

### Get the Algorand address for an EVM account

```typescript
const algoAddr = await sdk.getAddress({ evmAddress })
// => "ALGO..."
```

This is useful for checking balances or displaying the address before any signing is needed.

### Get a TransactionSigner

`getSigner` returns an algokit-utils compatible `{ addr, signer }` pair. Pass `signMessage` — a callback that signs a raw `Uint8Array` with the EVM wallet (e.g. `personal_sign`) and returns a 0x-prefixed 65-byte hex signature.

```typescript
const { addr, signer } = await sdk.getSigner({
  evmAddress,
  signMessage: (msg) => evmWallet.signMessage(msg),
})
```

### Send a standalone transaction

```typescript
await algorand.send.payment({
  sender: addr,
  receiver: addr,
  amount: (0).algos(),
  signer,
})
```

### Send an atomic group

For grouped transactions of size > 1, the signer automatically signs the **group ID** instead of individual transaction IDs. The on-chain logic signature handles this automatically.

```typescript
await algorand.newGroup()
  .addPayment({
    sender: addr,
    receiver: someReceiver,
    amount: (1).algos(),
    signer,
  })
  .addPayment({
    sender: otherAccount.addr,
    receiver: otherAccount.addr,
    amount: (0).algos(),
  })
  .send()
```

### Sign raw algosdk transactions

For full control over transaction construction and group ID assignment, use `signTxn`. This is useful when working directly with algosdk.

```typescript
import algosdk from "algosdk"

const addr = await sdk.getAddress({ evmAddress })

const txn = await algorand.createTransaction.payment({
  sender: addr,
  receiver: addr,
  amount: (0).algos(),
})
const [gtxn] = algosdk.assignGroupID([txn])

const [signed] = await sdk.signTxn({
  evmAddress,
  txns: [gtxn],
  signMessage: (msg) => evmWallet.signMessage(msg),
})

await algorand.client.algod.sendRawTransaction(signed).do()
```

## API

### `LiquidEvmSdk`

#### `constructor({ algorand: AlgorandClient })`

Creates an SDK instance. The `AlgorandClient` is used to compile the TEAL template. Compiled programs are cached per EVM address.

#### `getAddress({ evmAddress: string }): Promise<string>`

Returns the Algorand lsig address for the given EVM address. The `evmAddress` should be a hex string (with or without `0x` prefix).

#### `getSigner({ evmAddress, signMessage }): Promise<{ addr: string; signer: TransactionSigner }>`

Returns the Algorand address and a `TransactionSigner` that can be passed directly to any algokit-utils send method.

- `evmAddress` — hex string (with or without `0x` prefix)
- `signMessage` — `(message: Uint8Array) => Promise<string>` — signs a raw message with the EVM wallet and returns a 0x-prefixed 65-byte hex signature

The signer automatically determines what to sign: the transaction ID for standalone transactions, or the group ID for atomic groups.

#### `signTxn({ evmAddress, txns, signMessage }): Promise<Uint8Array[]>`

Signs one or more algosdk `Transaction` objects with the EVM lsig. Returns an array of signed transaction blobs ready for `sendRawTransaction`.

- `evmAddress` — hex string (with or without `0x` prefix)
- `txns` — algosdk `Transaction[]` to sign (must already have group ID assigned via `algosdk.assignGroupID` if grouped)
- `signMessage` — `(message: Uint8Array) => Promise<string>` — signs a raw message with the EVM wallet

The payload signed is the group ID if there are more than 1 transactions, otherwise the transaction ID.

### Utilities

#### `parseEvmSignature(sigHex: string): Uint8Array`

Parses a 0x-prefixed 65-byte EVM signature hex string into a `Uint8Array` of `R(32) || S(32) || V(1)`.

#### `hexToBytes(hex: string): Uint8Array`

Converts a hex string to a `Uint8Array`.

## Security

- Each EVM address maps to a unique Algorand lsig address. Only the holder of the corresponding EVM private key can authorize transactions from that address.
- The signature covers the transaction ID (standalone) or group ID (atomic group), preventing replay across different transactions.
- The `personal_sign` prefix (`\x19Ethereum Signed Message:\n32`) is enforced on-chain, matching the standard EVM signing format.

## License

MIT

# avm-x-evm

Use EVM wallets (MetaMask, etc.) to sign and send Algorand transactions using **EIP-712 typed structured data**.

The SDK compiles a per-address [logic signature](https://dev.algorand.co/concepts/smart-contracts/logic-sigs/) that validates EVM (secp256k1) signatures on-chain using the AVM's native `ecdsa_pk_recover` and `keccak256` opcodes.
Each EVM address maps deterministically to an Algorand lsig address that only that EVM private key can authorize.

To find out more, check out the [architecture](./ARCHITECTURE.md) for details about the contract and how it works.

## 📦 Install

```bash
npm install avm-x-evm
```

Peer dependencies:

```bash
npm install @algorandfoundation/algokit-utils algosdk
```

## ℹ️ How it works

```mermaid
sequenceDiagram
    participant W as EVM Wallet
    participant D as Algorand dApp
    participant A as Algorand

    Note over D: Build Algorand txn
    D->>W: eth_signTypedData_v4(txnId)
    Note over W: User signs
    W->>D: Return signature
    D->>A: Submit txn + lsig + signature
    Note over A: AVM recovers signer from sig
    Note over A: Checks recovered address == templated owner
    Note over A: Transaction executes
```

The logic signature:

1. Takes the transaction ID (or group ID for atomic groups) as the payload
2. Reads the EVM signature from `arg[0]` (65 bytes: R || S || V)
3. Computes the EIP-712 digest: `keccak256("\x19\x01" + domainSeparator + messageHash)`
4. Recovers the signer's public key via `ecdsa_pk_recover` (secp256k1)
5. Derives the Ethereum address: `keccak256(pubkeyX || pubkeyY)[12:32]`
6. Approves if the recovered address matches the templated owner

### EIP-712 Domain

```typescript
{
  name: "Liquid Accounts",
  version: "1",
  chainId: 4160  // Algorand constant for all networks
}
```

### EIP-712 Types

```typescript
{
  AlgorandTransaction: [{ name: "Transaction ID", type: "bytes32" }];
}
```

## 📝 Usage

### Setup

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { LiquidEvmSdk, EIP712_DOMAIN, EIP712_TYPES } from "liquid-accounts-evm";
import { BrowserProvider } from "ethers";

const algorand = AlgorandClient.fromEnvironment();
const sdk = new LiquidEvmSdk({ algorand });

// MetaMask or other EVM wallet provider
const provider = new BrowserProvider(window.ethereum);
const evmAddress = (await provider.send("eth_requestAccounts", []))[0];
```

### Get the Algorand address for an EVM account

```typescript
const algoAddr = await sdk.getAddress({ evmAddress });
// => "ALGO..."
```

This is useful for checking balances or displaying the address before any signing is needed.

### Get a TransactionSigner

`getSigner` returns an algokit-utils compatible `{ addr, signer }` pair. Pass `signMessage` — a callback that receives the full EIP-712 typed data (domain, types, primaryType, message) and returns the signature.

```typescript
import { ethers } from "ethers";
import type { SignTypedDataParams } from "liquid-accounts-evm";

const wallet = new ethers.Wallet(privateKey);

// signMessage receives all EIP-712 data — just forward to signTypedData
const signMessage = async ({ domain, types, message }: SignTypedDataParams) => {
  return wallet.signTypedData(domain, types, message);
};

const { addr, signer } = await sdk.getSigner({
  evmAddress,
  signMessage,
});
```

Or with MetaMask:

```typescript
const signMessage = async ({ domain, types, primaryType, message }: SignTypedDataParams) => {
  const data = JSON.stringify({ domain, types, primaryType, message });
  return provider.send("eth_signTypedData_v4", [evmAddress, data]);
};

const { addr, signer } = await sdk.getSigner({ evmAddress, signMessage });
```

### Send a standalone transaction

```typescript
await algorand.send.payment({
  sender: addr,
  receiver: addr,
  amount: (0).algos(),
  signer,
});
```

### Send an atomic group

For grouped transactions of size > 1, the signer automatically signs the **group ID** instead of individual transaction IDs. The on-chain logic signature handles this automatically.

```typescript
await algorand
  .newGroup()
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
  .send();
```

### Sign raw algosdk transactions

For full control over transaction construction and group ID assignment, use `signTxn`. This is useful when working directly with algosdk.

#### Variant 1: With signMessage callback

```typescript
import algosdk from "algosdk";
import type { SignTypedDataParams } from "liquid-accounts-evm";

const addr = await sdk.getAddress({ evmAddress });

const txn = await algorand.createTransaction.payment({
  sender: addr,
  receiver: addr,
  amount: (0).algos(),
});
const [gtxn] = algosdk.assignGroupID([txn]);

const signMessage = async ({ domain, types, message }: SignTypedDataParams) => {
  return wallet.signTypedData(domain, types, message);
};

const [signed] = await sdk.signTxn({
  evmAddress,
  txns: [gtxn],
  signMessage,
});

await algorand.client.algod.sendRawTransaction(signed).do();
```

#### Variant 2: With pre-computed signature

```typescript
import algosdk from "algosdk";
import { LiquidEvmSdk, buildTypedData } from "liquid-accounts-evm";

const addr = await sdk.getAddress({ evmAddress });

const txn = await algorand.createTransaction.payment({
  sender: addr,
  receiver: addr,
  amount: (0).algos(),
});
const [gtxn] = algosdk.assignGroupID([txn]);

// Pre-compute the signature
const payload = LiquidEvmSdk.getSignPayload([gtxn]);
const { domain, types, message } = buildTypedData(payload);
const signature = await wallet.signTypedData(domain, types, message);

// Sign using pre-computed signature
const [signed] = await sdk.signTxn({
  evmAddress,
  txns: [gtxn],
  signature,
});

await algorand.client.algod.sendRawTransaction(signed).do();
```

## 🏗️ API

### `LiquidEvmSdk`

#### `constructor({ algorand: AlgorandClient })`

Creates an SDK instance. The `AlgorandClient` is used to compile the TEAL template. Compiled programs are cached per EVM address.

#### `getAddress({ evmAddress: string }): Promise<string>`

Returns the Algorand lsig address for the given EVM address. The `evmAddress` should be a hex string (with or without `0x` prefix).

#### `getSigner({ evmAddress, signMessage }): Promise<{ addr: string; signer: TransactionSigner }>`

Returns the Algorand address and a `TransactionSigner` that can be passed directly to any algokit-utils send method.

- `evmAddress` — hex string (with or without `0x` prefix)
- `signMessage` — `(typedData: SignTypedDataParams) => Promise<string>` — receives the full EIP-712 typed data (domain, types, primaryType, message) and should return the signature.

The signer automatically determines what to sign: the transaction ID for standalone transactions, or the group ID for atomic groups.

#### `signTxn({ evmAddress, txns, signMessage }): Promise<Uint8Array[]>`

#### `signTxn({ evmAddress, txns, signature }): Promise<Uint8Array[]>`

Signs one or more algosdk `Transaction` objects with the EVM lsig. Returns an array of signed transaction blobs ready for `sendRawTransaction`.

**Parameters:**

- `evmAddress` — hex string (with or without `0x` prefix)
- `txns` — algosdk `Transaction[]` to sign (must already have group ID assigned via `algosdk.assignGroupID` if grouped)
- `signMessage` — (variant 1) `(typedData: SignTypedDataParams) => Promise<string>` — receives the full EIP-712 typed data and should return the signature
- `signature` — (variant 2) `string` — pre-computed EIP-712 signature (0x-prefixed 65-byte hex string)

The payload signed is the group ID if there are more than 1 transactions, otherwise the transaction ID.

**Example with callback:**

```typescript
await sdk.signTxn({ evmAddress, txns, signMessage });
```

**Example with pre-computed signature:**

```typescript
const payload = LiquidEvmSdk.getSignPayload(txns);
const signature = await getSignature(payload);
await sdk.signTxn({ evmAddress, txns, signature });
```

### Types

#### `SignTypedDataParams`

Interface for the EIP-712 typed data passed to `signMessage` callbacks:

```typescript
interface SignTypedDataParams {
  domain: { name: string; version: string; chainId: number };
  types: {
    EIP712Domain: Array<{ name: string; type: string }>;
    AlgorandTransaction: Array<{ name: string; type: string }>;
  };
  primaryType: "AlgorandTransaction";
  message: { "Transaction ID": string };
}
```

### Utilities

#### `buildTypedData(payload: Uint8Array): SignTypedDataParams`

Builds a complete EIP-712 typed data object from a raw transaction/group ID payload. Useful when pre-computing signatures outside the SDK callbacks.

```typescript
const payload = LiquidEvmSdk.getSignPayload(txns);
const { domain, types, message } = buildTypedData(payload);
const signature = await wallet.signTypedData(domain, types, message);
```

#### `formatEIP712Message(payload: Uint8Array): { "Transaction ID": string }`

Formats a raw transaction/group ID payload as an EIP-712 typed data message. Helper for use with signing callbacks.

```typescript
const payload = new Uint8Array(32); // transaction or group ID
const message = formatEIP712Message(payload);
// => { "Transaction ID": "0x..." }
```

#### `parseEvmSignature(sigHex: string): Uint8Array`

Parses a 0x-prefixed 65-byte EVM signature hex string into a `Uint8Array` of `R(32) || S(32) || V(1)`.

**Security**: Automatically normalizes signatures to lower-S form because the AVM only accepts lower-S signatures. If `s > n/2` (where n is the secp256k1 curve order), the signature is normalized to `n - s` with the recovery ID flipped.

```typescript
const sig = parseEvmSignature("0x1234..."); // 65-byte signature
// Returns normalized signature with s in lower half
```

#### `EIP712_DOMAIN`

The EIP-712 domain used for signing:

```typescript
{
  name: "Liquid Accounts",
  version: "1",
  chainId: 4160  // Algorand constant
}
```

#### `EIP712_TYPES`

The EIP-712 types used for signing:

```typescript
{
  AlgorandTransaction: [{ name: "Transaction ID", type: "bytes32" }];
}
```

#### `ALGORAND_CHAIN_ID`

The Algorand chainId constant: `4160` (used across all Algorand networks)

#### `hexToBytes(hex: string): Uint8Array`

Converts a hex string to a `Uint8Array`.

## 🔒️ Security

- Each EVM address maps to a unique Algorand lsig address. Only the holder of the corresponding EVM private key can authorize transactions from that address.
- The signature covers the transaction ID (standalone) or group ID (atomic group), preventing replay across different transactions.
- **EIP-712** provides domain separation, preventing cross-app and cross-network replay attacks.
- Users see human-readable transaction data in their wallet (MetaMask, etc.) instead of raw hex.
- **Lower-S normalization**: All signatures are automatically normalized to lower-S form because the AVM only accepts lower-S signatures. If `s > n/2`, the signature is converted to `(r, n - s)` with the recovery ID flipped.

## 📄 License

[MIT](./LICENSE)

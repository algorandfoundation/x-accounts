# xChain Accounts

**EVM Account Abstraction on Algorand via ECDSA signature verification**

xChain EVM enables Ethereum wallets (MetaMask, etc.) to control Algorand accounts using an ECDSA signature verification LogicSig. Sign once with your Ethereum wallet to authorize transactions on Algorand—no seed phrases, no new wallets.

> [!IMPORTANT]
>
> The xChain Accounts protocol is in Beta.
>
> Currently, only React frontends are supported.

Interested in integrating xChain Accounts? Consider filling in a [quick survey](https://forms.gle/qjY5hLREzem6Wrvk6).

## Overview

This monorepo contains:

- **[Logic Sig](projects/evm-logicsig/)** - LogicSig that verifies ECDSA (secp256k1) signatures from EVM addresses
- **[SDK](projects/evm-sdk/)** - TypeScript SDK for integrating EVM wallet signing with Algorand
- **[use-wallet](projects/use-wallet/)** - @txnlab/use-wallet with xChain EVM / MetaMask support
- **[use-wallet-ui](projects/use-wallet-ui/)** - @txnlab/use-wallet-ui with xChain EVM / MetaMask support
- **[frontend](projects/frontend/)** - React demo application with MetaMask integration
- **[portal](projects/portal/)** - Docs and information portal (TanStack Start + Cloudflare)
- **[rpc-server](projects/rpc-server/)** - Mock Ethereum JSON-RPC server (Cloudflare Worker) that lets MetaMask Mobile connect to Algorand as a custom network. Responds to standard RPC methods (`eth_chainId`, `eth_blockNumber`, `net_version`, `eth_gasPrice`, `eth_getBlockByNumber`) and serves real ALGO balances via `eth_getBalance` by deriving the xChain EVM address and querying Algorand mainnet, converting from 6-decimal microAlgos to 18-decimal wei.
- **[dfx](projects/dfx/)** - Deferred Execution Service (Cloudflare Worker + Durable Object) that accepts signed transaction groups, simulates them, and retries those that fail due to insufficient balance until they become valid or expire.

## How It Works

1. **Derive Algorand Address**: Each EVM address (20 bytes) maps deterministically to a unique Algorand LogicSig address
2. **Sign with EVM Wallet**: MetaMask signs the transaction/group ID using EIP-712 typed structured data (`eth_signTypedData_v4`)
3. **Verify on Algorand**: The LogicSig recovers the public key from the signature and verifies it matches the template owner
4. **Execute Transaction**: If verification succeeds, the transaction is approved

### Technical Details

The LogicSig contract:

- Uses `ecdsaPkRecover` (secp256k1) to recover the signer's public key
- Derives the Ethereum address from the recovered public key (last 20 bytes of keccak256)
- Compares the recovered address against the template owner
- Computes an EIP-712 digest over the transaction ID (single txn) or group ID (atomic groups), providing domain separation

### Why EIP-712 Structured Signing

The LogicSig uses [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed structured data rather than raw `personal_sign` for two reasons:

- **Domain separation**: The EIP-712 domain (`name`, `version`) is embedded in the signed digest, preventing signatures from being replayed across different applications or protocols. Network-level replay protection is provided by the Algorand transaction's genesis hash, which is already part of the signed transaction ID/group ID.
- **Human-readable signing prompts**: EVM wallets (MetaMask, etc.) display the structured fields to the user instead of an opaque hex blob, making it clear what is being authorized.

## Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org/en/download)
- [AlgoKit CLI 2.5+](https://github.com/algorandfoundation/algokit-cli#install)
- [Docker](https://www.docker.com/) (for LocalNet)
- [pnpm >= 10.29.3](https://pnpm.io/installation)

The recommended way to install pnpm is via [Corepack](https://nodejs.org/api/corepack.html), which ships with Node.js:

```bash
corepack enable
corepack prepare pnpm@10.29.3 --activate
```

Alternative: standalone install

```
npm install -g pnpm@10.29.3
```

### Installation

```bash
# Clone the repository
git clone https://github.com/algorandfoundation/xchain-accounts.git
cd xchain-accounts

# fetch the submodules (use-wallet, use-wallet-ui)
git submodule update --init --recursive

# Install dependencies (use-wallet-ui is a nested pnpm workspace, needs its own install)
# Read the output carefully, you may need to approve build scripts.
pnpm i
pnpm i --dir projects/use-wallet-ui

# Set up git hooks (husky + lint-staged) - run once after cloning
pnpm exec husky

# Start LocalNet
algokit localnet start

# Build all projects
algokit project run build
```

### Running the Demo

```bash
# Start the frontend (from root directory)
cd projects/frontend
pnpm dev
```

Open http://localhost:5173 and connect MetaMask to see EVM-controlled Algorand accounts in action.

> **Note**: The derived Algorand address must be funded before it can send transactions. New accounts need a minimum balance of 0.1 ALGO to exist on the network. You can fund the account from AlgoKit LocalNet dispenser or use the frontend to display the address and send funds to it.

## Project Structure

```
xchain-accounts/
├── projects/
│   ├── evm-logicsig/    # Smart contract (Algorand TypeScript)
│   ├── evm-sdk/         # TypeScript SDK
│   ├── frontend/        # React demo application
│   ├── portal/          # Docs/info portal (TanStack Start + Cloudflare)
│   ├── rpc-server/      # Mock Ethereum JSON-RPC (Cloudflare Worker)
│   ├── dfx/             # Deferred Execution Service (Cloudflare Worker + DO)
│   ├── use-wallet/      # Enhanced @txnlab/use-wallet with xChain EVM support
│   └── use-wallet-ui/   # Enhanced @txnlab/use-wallet-ui with xChain EVM support
```

## SDK Usage

Install the SDK:

```bash
npm install algo-x-evm-sdk
# or
pnpm add algo-x-evm-sdk
```

Basic usage:

```typescript
import { AlgoXEvmSdk } from "algo-x-evm-sdk"
import { AlgorandClient } from "@algorandfoundation/algokit-utils"

// Initialize
const algorand = AlgorandClient.fromEnvironment()
const sdk = new AlgoXEvmSdk({ algorand })

// Get Algorand address for an EVM address
const algoAddress = await sdk.getAddress({
  evmAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
})

// Get a transaction signer (EIP-712 typed data signing)
const evmAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
const { addr, signer } = await sdk.getSigner({
  evmAddress,
  signMessage: async ({ domain, types, primaryType, message }) => {
    const data = JSON.stringify({ domain, types, primaryType, message })
    return window.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [evmAddress, data],
    })
  },
})

// Use with algokit-utils
await algorand.send.payment({
  sender: addr,
  signer: signer,
  receiver: recipientAddress,
  amount: (1).algos(),
})
```

## use-wallet

The use-wallet fork introduces a base class for xChain Accounts, as well as an implementation for Metamask. This should be a drop-in replacement for Algorand dApps.

## use-wallet-ui & meta-wallet

Opinionated fork of use-wallet-ui adds "meta-wallet" functionality to dApps:

- transaction transparency, see what you are signing before you sign
  - security context: runs in dApp; vulnerable in malicious or compromised dApps
- Initiate transactions for managing assets, sending ALGO, etc
  - WIP
- Onboarding guide for xChain Accounts with 0 ALGO balance

Integration Effort:

- Drop-in for transaction transparency
- Minor integration needed for wallet management (integrate <WalletButton />)

Possible future work:

- Develop optional companion extension for dApp-independent txn verification
- Integrated bridging to bootstrap account w/ USDC without leaving dApp

## Development Workflow

### Build

```bash
algokit project run build
```

This compiles, in order (per `.algokit.toml`):

1. Logic sig to TEAL (`evm-logicsig`)
2. TypeScript SDK (`evm-sdk`)
3. Use-wallet packages (`use-wallet`)
4. Use-wallet-ui package (`use-wallet-ui`)
5. Portal (`portal`)
6. Frontend (`frontend`)
7. RPC server (`rpc-server`)

`dfx` is not part of the algokit workspace build; build it directly with `pnpm --filter dfx build`.

### Test

Currently `evm-logicsig` and `dfx` projects have automated tests.

```bash
algokit project run test
pnpm --filter dfx test
```

## Contributing

Contributions are welcome! Please see individual project READMEs for specific development guidelines:

- [Smart Contract Development](projects/evm-logicsig/README.md)
- [SDK Development](projects/evm-sdk/README.md)
- [Frontend Development](projects/frontend/README.md)

## Security Considerations

- The LogicSig verifies signatures using ECDSA secp256k1 curve
- A template variable (owner address) ensures each EVM address has a unique Algorand address
- Signatures are automatically normalized to lower-S form because the AVM only accepts lower-S signatures
- EIP-712 domain separation prevents AVM<>EVM contamination
- The contract binds signatures to specific transaction/group IDs, preventing replay across AVM networks (genesisHash) & time (first/lastRound)
- Always verify the derived Algorand address matches expectations

## CI/CD

GitHub Actions workflows are present in [`.github/workflows`](./.github/workflows). On PR to `main`, CI runs two jobs:

- **test**: Installs dependencies, starts localnet and runs existing first-party project tests (dfx and evm-logicsig)
- **build**: Installs dependencies, builds AlgoKit projects and dfx - Gated by test

Additional workflows for smart-contract CI/CD, validation, and release are present but currently disabled (suffixed `.disabled`), kept as reference until the automated pipeline is fully complete.

## Resources

- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Algorand Developer Portal](https://dev.algorand.co/)
- [Algorand TypeScript](https://github.com/algorandfoundation/puya-ts)
- [ECDSA on Algorand](https://dev.algorand.co/reference/algorand-teal/opcodes/#ecdsa_verify)

## License

MIT

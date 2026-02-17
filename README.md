# Liquid Accounts

**EVM Account Abstraction on Algorand via ECDSA signature verification**

Liquid EVM enables Ethereum wallets (MetaMask, etc.) to control Algorand accounts using an ECDSA signature verification LogicSig. Sign once with your Ethereum wallet to authorize transactions on Algorand—no seed phrases, no new wallets.

## Overview

This monorepo contains:

- **[Logic Sig](projects/evm-logicsig/)** - LogicSig that verifies ECDSA (secp256k1) signatures from EVM addresses
- **[SDK](projects/evm-sdk/)** - TypeScript SDK for integrating EVM wallet signing with Algorand
- **[use-wallet](projects/use-wallet/)** - @txnlab/use-wallet with Liquid EVM / MetaMask support
- **[use-wallet-ui](projects/use-wallet-ui/)** - @txnlab/use-wallet-ui with Liquid EVM / MetaMask support
- **[frontend](projects/frontend/)** - React demo application with MetaMask integration
- **[rpc-server](projects/rpc-server/)** - Mock Ethereum JSON-RPC server (Cloudflare Worker) that lets MetaMask Mobile connect to Algorand as a custom network. Responds to standard RPC methods (`eth_chainId`, `eth_blockNumber`, `net_version`, `eth_gasPrice`, `eth_getBlockByNumber`) and serves real ALGO balances via `eth_getBalance` by deriving the Liquid Account address and querying Algorand mainnet, converting from 6-decimal microAlgos to 18-decimal wei.

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

- **Domain separation**: The EIP-712 domain (`name`, `version`, `chainId`) is embedded in the signed digest, preventing signatures from being replayed across different applications or protocols.
- **Human-readable signing prompts**: EVM wallets (MetaMask, etc.) display the structured fields to the user instead of an opaque hex blob, making it clear what is being authorized.

**Chain ID approach**: A single `chainId` of `4160` is used across all Algorand networks (MainNet, TestNet, LocalNet). Using per-network chain IDs would cause different derived Algorand addresses per network for the same EVM account, which is undesirable. Network-level replay protection is instead provided by the Algorand transaction's genesis hash, which is already part of the signed transaction ID/group ID.

## Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org/en/download)
- [AlgoKit CLI 2.5+](https://github.com/algorandfoundation/algokit-cli#install)
- [Docker](https://www.docker.com/) (for LocalNet)
- [pnpm](https://pnpm.io/installation)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/liquid-accounts.git
cd liquid-accounts

# Bootstrap the project (installs dependencies)
algokit project bootstrap all

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
liquid-accounts/
├── projects/
│   ├── evm-logicsig/    # Smart contract (Algorand TypeScript)
│   ├── evm-sdk/         # TypeScript SDK
│   ├── frontend/        # React demo application
│   ├── rpc-server/      # Mock Ethereum JSON-RPC (Cloudflare Worker)
│   ├── use-wallet/      # Enhanced @txnlab/use-wallet with Liquid EVM support
│   └── use-wallet-ui/   # Enhanced @txnlab/use-wallet-ui with Liquid EVM support
```

## SDK Usage

Install the SDK:

```bash
npm install liquid-accounts-evm
# or
pnpm add liquid-accounts-evm
```

Basic usage:

```typescript
import { LiquidEvmSdk, formatEIP712Message, EIP712_DOMAIN, EIP712_TYPES } from 'liquid-accounts-evm'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

// Initialize
const algorand = AlgorandClient.fromEnvironment()
const sdk = new LiquidEvmSdk({ algorand })

// Get Algorand address for an EVM address
const algoAddress = await sdk.getAddress({
  evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
})

// Get a transaction signer (EIP-712 typed data signing)
const { addr, signer } = await sdk.getSigner({
  evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  signMessage: async (payload) => {
    const message = formatEIP712Message(payload)
    const data = JSON.stringify({
      domain: EIP712_DOMAIN,
      types: EIP712_TYPES,
      message,
      primaryType: "AlgorandTransaction"
    })
    return window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [evmAddress, data]
    })
  }
})

// Use with algokit-utils
await algorand.send.payment({
  sender: addr,
  signer: signer,
  receiver: recipientAddress,
  amount: (1).algos()
})
```

## Development Workflow

### Build

```bash
algokit project run build
```

This compiles:
1. Logic sig to TEAL
2. TypeScript SDK
3. Use-wallet packages
4. Use-wallet-ui package
5. Frontend

### Test

```bash
cd projects/evm-logicsig
algokit project run test
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

This project uses GitHub Actions for continuous integration and deployment. Workflows are located in [`.github/workflows`](./.github/workflows).

On `main` branch pushes:
- Automated testing and linting
- Smart contract deployment to TestNet via [AlgoNode](https://algonode.io)

## Resources

- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Algorand Developer Portal](https://developer.algorand.org/)
- [Algorand TypeScript](https://github.com/algorandfoundation/puya-ts)
- [ECDSA on Algorand](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/opcodes/#ecdsa_verify)

## License

MIT

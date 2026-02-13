# Liquid Accounts

**EVM-controlled Algorand accounts via ECDSA signature verification**

Liquid EVM enables Ethereum wallets (MetaMask, WalletConnect, etc.) to control Algorand accounts using an ECDSA signature verification LogicSig. Sign once with your Ethereum wallet to authorize transactions on Algorand—no seed phrases, no new accounts.

## Overview

This monorepo contains:

- **[Smart Contract](projects/evm-logicsig/)** - LogicSig that verifies ECDSA (secp256k1) signatures from EVM addresses
- **[SDK](projects/evm-sdk/)** - TypeScript SDK for integrating EVM wallet signing with Algorand
- **[Frontend](projects/frontend/)** - React demo application with MetaMask integration
- **[Use Wallet](projects/use-wallet/)** - Enhanced `@txnlab/use-wallet` with MetaMask provider support

## How It Works

1. **Derive Algorand Address**: Each EVM address (20 bytes) maps deterministically to a unique Algorand LogicSig address
2. **Sign with EVM Wallet**: MetaMask signs the transaction/group ID using Ethereum's `personal_sign`
3. **Verify on Algorand**: The LogicSig recovers the public key from the signature and verifies it matches the template owner
4. **Execute Transaction**: If verification succeeds, the transaction is approved

### Technical Details

The LogicSig contract:

- Uses `ecdsaPkRecover` (secp256k1) to recover the signer's public key
- Derives the Ethereum address from the recovered public key (last 20 bytes of keccak256)
- Compares the recovered address against the template owner
- Signs either transaction ID (single txn) or group ID (atomic groups)

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
│   └── use-wallet/      # Enhanced @txnlab/use-wallet with MetaMask support
├── .algokit.toml        # AlgoKit workspace configuration
└── pnpm-workspace.yaml  # pnpm monorepo configuration
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
import { LiquidEvmSdk } from 'liquid-accounts-evm'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

// Initialize
const algorand = AlgorandClient.fromEnvironment()
const sdk = new LiquidEvmSdk({ algorand })

// Get Algorand address for an EVM address
const algoAddress = await sdk.getAddress({ 
  evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' 
})

// Get a transaction signer
const { addr, signer } = await sdk.getSigner({
  evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  signMessage: async (message) => {
    // Call MetaMask or other EVM wallet
    return window.ethereum.request({
      method: 'personal_sign',
      params: [message, evmAddress]
    })
  }
})

// Use with algokit-utils
await algorand.send.payment({
  sender: addr,
  signer: signer,
  receiver: recipientAddress,
  amount: AlgoAmount.Algos(1)
})
```

## Development Workflow

### Build

```bash
algokit project run build
```

This compiles:
1. Smart contracts to TEAL
2. TypeScript SDK
3. Frontend application

### Test

```bash
cd projects/evm-logicsig
algokit project run test
```

### Deploy

```bash
# Deploy to LocalNet
algokit project deploy localnet

# Deploy to TestNet
algokit project deploy testnet
```

## Contributing

Contributions are welcome! Please see individual project READMEs for specific development guidelines:

- [Smart Contract Development](projects/evm-logicsig/README.md)
- [SDK Development](projects/evm-sdk/README.md)
- [Frontend Development](projects/frontend/README.md)

## Security Considerations

- The LogicSig verifies signatures using ECDSA secp256k1 curve
- Template variables ensure each EVM address has a unique Algorand address
- The contract signs transaction/group IDs, preventing signature replay
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

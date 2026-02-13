# EVM LogicSig

Algorand smart contract that enables EVM wallet addresses to control Algorand accounts through ECDSA signature verification.

## Overview

This project contains the LogicSig (Logic Signature) smart contract that verifies ECDSA (secp256k1) signatures from Ethereum addresses. The contract allows MetaMask and other EVM wallets to sign and authorize Algorand transactions without requiring users to manage separate Algorand keys.

### What is a LogicSig?

A LogicSig is a stateless smart contract on Algorand that can authorize transactions. Unlike traditional Algorand accounts that use Ed25519 signatures, this LogicSig:

1. Accepts ECDSA signatures from Ethereum wallets
2. Recovers the signer's public key using `ecdsaPkRecover`
3. Derives the Ethereum address from the recovered public key
4. Approves transactions if the address matches the template owner

### Key Features

- **Deterministic addresses**: Each EVM address maps to a unique Algorand LogicSig address
- **Atomic groups**: Supports multi-transaction atomic groups (signs group ID)
- **Signature validation**: Uses AVM's native `ecdsa_pk_recover` and `keccak256` opcodes
- **Template-based**: Compiled per EVM address using template variables

## Project Structure

```
evm-logicsig/
├── smart_contracts/
│   ├── liquidevm/
│   │   ├── logicsig.algo.ts        # Main LogicSig contract
│   │   ├── contract.e2e.spec.ts    # E2E tests
│   │   └── deploy-config.ts        # Deployment configuration
│   ├── artifacts/                   # Compiled TEAL output
│   └── index.ts                     # Deployment entry point
├── .algokit.toml                    # AlgoKit project configuration
└── package.json
```

## How the Contract Works

### Signature Verification Flow

```
1. EVM Wallet signs:    personal_sign(keccak256("\x19Ethereum Signed Message:\n32" + txnId))
                        ↓
2. LogicSig receives:   R (32 bytes) || S (32 bytes) || V (1 byte) in arg[0]
                        ↓
3. Contract recovers:   ecdsaPkRecover(digest, recoveryId, r, s) → pubkey
                        ↓
4. Contract derives:    keccak256(pubkeyX || pubkeyY)[12:32] → address
                        ↓
5. Contract validates:  recoveredAddress === templateOwner
```

### Template Variables

The contract uses one template variable:

- **OWNER**: 20-byte Ethereum address that controls this LogicSig instance

When compiling, the SDK substitutes the EVM address into the TEAL bytecode, creating a unique LogicSig program for each EVM address.

## Setup

### Prerequisites

- [Nodejs 22](https://nodejs.org/en/download) or later
- [AlgoKit CLI 2.5](https://github.com/algorandfoundation/algokit-cli?tab=readme-ov-file#install) or later
- [Docker](https://www.docker.com/) (only required for LocalNet)
- [Puya Compiler 4.4.4](https://pypi.org/project/puyapy/) or later

> For interactive tour over the codebase, download [vsls-contrib.codetour](https://marketplace.visualstudio.com/items?itemName=vsls-contrib.codetour) extension for VS Code, then open the [`.codetour.json`](./.tours/getting-started-with-your-algokit-project.tour) file in code tour extension.

### Initial Setup

From the **repository root**:

```bash
# Install dependencies
algokit project bootstrap all

# Start LocalNet
algokit localnet start

# Build the contract
algokit project run build

# Run tests
algokit project run test
```

## Development Workflow

### Building

Compile the contract to TEAL:

```bash
# From repository root
algokit project run build

# Or from this directory
npm run build
```

This generates TEAL bytecode in `smart_contracts/artifacts/liquidevm/`.

### Testing

The project includes comprehensive E2E tests that verify:

- ECDSA signature verification
- Standalone transaction signing
- Atomic group transaction signing
- Template variable substitution

> **Important**: The tests use the [liquid-accounts-evm SDK](../evm-sdk/), which must be built before running tests. If you modify the LogicSig contract, rebuild both the contract and the SDK for changes to be reflected in tests:
>
> ```bash
> # From repository root
> algokit project run build
> ```
>
> This builds the contract TEAL → SDK imports TEAL → tests use SDK.

Run tests:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

The test suite uses:

- **vitest** for test execution
- **@noble/secp256k1** for generating test EVM signatures
- **AlgoKit Utils** for interacting with LocalNet
- **liquid-accounts-evm** for LogicSig compilation and signing

### Deploying

> **Note**: This is a LogicSig, not an application contract. It doesn't need deployment in the traditional sense. Instead, the SDK compiles it on-demand with the specific EVM address as a template parameter.

For development/testing purposes:

```bash
algokit project deploy localnet
```

## Contract Details

### File: `smart_contracts/liquidevm/logicsig.algo.ts`

The LogicSig is written in [Algorand TypeScript](https://github.com/algorandfoundation/puya-ts), which compiles to TEAL bytecode.

**Key operations:**

1. **Extract signature components** from arg[0]: R (32), S (32), V (1)
2. **Compute digest**: `keccak256("\x19Ethereum Signed Message:\n32" + payload)`
3. **Recover public key**: `ecdsaPkRecover(Secp256k1, digest, recoveryId, r, s)`
4. **Derive address**: Last 20 bytes of `keccak256(pubkeyX || pubkeyY)`
5. **Validate**: `recoveredAddress === owner`

**Payload signed:**
- Single transaction: Transaction ID
- Atomic group: Group ID

This prevents signature replay across different transactions or groups.

### TEAL Opcodes Used

- `ecdsa_pk_recover Secp256k1` - Recovers public key from signature
- `keccak256` - Computes Ethereum-compatible hash
- `extract` - Extracts bytes from arrays
- `concat` - Concatenates byte arrays
- `btoi` - Converts bytes to integer (for V parameter)

## Security Considerations

- **Signature malleability**: The contract accepts both high and low S values (standard ECDSA)
- **Template immutability**: Once compiled, the owner address cannot be changed
- **No reentrancy**: LogicSigs are stateless and cannot call other contracts
- **Transaction binding**: Signatures are bound to specific transactions via txnId/groupId

## Usage with SDK

See the [liquid-accounts-evm SDK](../evm-sdk/README.md) for integration examples.

Quick example:

```typescript
import { LiquidEvmSdk } from 'liquid-accounts-evm'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const algorand = AlgorandClient.fromEnvironment()
const sdk = new LiquidEvmSdk({ algorand })

// Get the Algorand address
const addr = await sdk.getAddress({ 
  evmAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' 
})

// Fund the address (minimum 0.1 ALGO)
// ... then sign transactions with MetaMask
```

## VS Code Debugging

This project includes AlgoKit AVM Debugger support. Use `F5` or the "Debug TEAL via AlgoKit AVM Debugger" launch configuration to debug contract execution with breakpoints.

Install the extension: [AlgoKit AVM Debugger](https://marketplace.visualstudio.com/items?itemName=algorandfoundation.algokit-avm-vscode-debugger)

## CI/CD

Automated workflows run on every push:

- **Testing**: E2E tests on AlgoKit LocalNet
- **Linting**: ESLint and Prettier checks  
- **Build verification**: TEAL compilation and output stability
- **Deployment**: TestNet deployment on `main` branch merges

See [`.github/workflows`](../../.github/workflows) for workflow definitions.

## Resources

- [Algorand TypeScript Documentation](https://github.com/algorandfoundation/puya-ts)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [ECDSA on Algorand](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/opcodes/#ecdsa_verify)
- [LogicSig Guide](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/smartsigs/)
- [Main Project README](../../README.md)

## License

MIT

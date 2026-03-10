## Project Structure

```
projects/evm/
├── smart_contracts/
│   ├── liquidevm/
│   │   ├── logicsig.algo.ts        # Main LogicSig contract
│   │   └── logicsig.e2e.spec.ts    # E2E tests
│   ├── artifacts/                   # Compiled TEAL output
├── src/                            # SDK Source code
│   ├── index.ts                    # LiquidEvmSdk
│   ├── teal.ts                     # Embedded TEAL bytecode
│   └── utils.ts                    # EIP-712 and ECDSA utils
```

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
pnpm run build
```

This generates TEAL bytecode in `./src/smart_contracts/artifacts/liquidevm/`.

### Testing

The project includes comprehensive E2E tests that verify:

- ECDSA signature verification
- Standalone transaction signing
- Atomic group transaction signing
- Template variable substitution

> **Important**: Rebuild the contract to ensure changes are reflected in the SDK and tests:
>
> ```bash
> # From repository root
> algokit project run build
> ```
>
> This builds the contract TEAL → SDK imports TEAL → tests use SDK.

Run tests:

```bash
pnpm run test          # Run all tests
pnpm run test:watch    # Watch mode
```

The project uses:

- **vitest** for test execution
- **@noble/secp256k1** for generating test EVM signatures
- **AlgoKit Utils** for interacting with LocalNet
- **avm-x-evm** (this package) for LogicSig compilation and signing

### Deploying

This is a LogicSig, not an application contract. It doesn't need deployment in the traditional sense. Instead, the SDK compiles it on-demand with the specific EVM address as a template parameter.

## VS Code Debugging

This project includes AlgoKit AVM Debugger support. Use `F5` or the "Debug TEAL via AlgoKit AVM Debugger" launch configuration to debug contract execution with breakpoints.

Install the extension: [AlgoKit AVM Debugger](https://marketplace.visualstudio.com/items?itemName=algorandfoundation.algokit-avm-vscode-debugger)

## Resources

- [Algorand TypeScript Documentation](https://github.com/algorandfoundation/puya-ts)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [ECDSA on Algorand](https://dev.algorand.co/reference/algorand-teal/opcodes/#ecdsa_verify)
- [LogicSig Guide](https://dev.algorand.co/concepts/smart-contracts/logic-sigs/)
- [Main Project README](../../README.md)

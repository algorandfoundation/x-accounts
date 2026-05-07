---
title: Security
description: How xChain EVM keeps your assets secure using on-chain ECDSA verification.
order: 7
category: Advanced
---

# Security Model

Understanding how xChain EVM secures your assets.

## Key Principles

1. **Your private key never leaves MetaMask** - the app only asks for signatures, never for your key
2. **Verification is on-chain** - the Algorand Smart Account verifies every signature using [`ecdsa_pk_recover`](https://dev.algorand.co/reference/algorand-teal/opcodes/#ecdsa_pk_recover)
3. **Deterministic address derivation** - your Algorand address is mathematically derived from your EVM address, not stored in a database
4. **Domain isolation** - EIP-712 signatures are scoped to the xChain EVM domain, so a signature you give to another dApp cannot be replayed to authorize an Algorand transaction

## How the Smart Account Works

An Algorand [Smart Account](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/smartsigs/modes/) is a program that can authorize transactions when its logic evaluates to true. The xChain EVM Smart Account:

1. Takes the **transaction group ID** (or single transaction ID) as the payload
2. Expects an **ECDSA signature** of the payload in an EIP-712 compatible structure
3. Verifies the ECDSA signature and recovers the **EVM public key** signature using Algorand's [`ecdsa_pk_recover`](https://dev.algorand.co/reference/algorand-teal/opcodes/#ecdsa_pk_recover) opcode
4. Derives the Ethereum address from the recovered public key and verifies it matches your **expected EVM address** embedded in the Smart Account
5. If and only if the address matches, the transaction is authorized

This means:

- No one can forge a transaction without your MetaMask signature
- The Smart Account cannot be tricked into authorizing a different transaction - the signed payload is the transaction ID itself
- Even if the app is compromised, an attacker cannot move your funds without your MetaMask approval

## EIP-712 Typed Data

Rather than signing raw bytes, xChain EVM uses [EIP-712](https://eips.ethereum.org/EIPS/eip-712) structured data signing. This means MetaMask shows you a human-readable signing prompt in an Algorand context, reducing the risk of inadvertently crossing the Algorand / EVM boundary.

## Trust Assumptions

- **You trust MetaMask** to correctly sign EIP-712 messages and not leak your private key
- **You trust the Algorand network** to correctly execute the [`ecdsa_pk_recover`](https://dev.algorand.co/reference/algorand-teal/opcodes/#ecdsa_pk_recover) opcode
- **You trust the Smart Account code** - it's open source and verifiable on-chain
- **You trust the dApp UI** to correctly display transaction details before you sign
  - **dApp-independent** transaction visualisation is coming soon

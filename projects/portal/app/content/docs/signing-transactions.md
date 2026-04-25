---
title: Signing Transactions
description: What happens when you sign an Algorand x EVM transaction in your EVM wallet.
order: 4
category: Using the App
---

# Signing Transactions

Every Algorand transaction made through Algorand x EVM is approved with a signature from your EVM wallet. Here's what to expect.

## What You'll See

When you do something that moves funds - sending, bridging, opting into an asset, or interacting with a dApp - the app prepares the transaction for your review, and then your wallet pops up asking you to **sign**.

1. The app shows you a visual summary of the transactions (typically sender, receiver, amount, assets, application IDs, etc)
2. The visualisations can be tapped to show full transaction details.
3. A resulting transction ID is shown in `0x...` hexadecimal format
4. Tap "Review" to send the transaction to your wallet.
5. Confirm that the transaction ID shown in your wallet matches the one from step 3.
6. Sign in your wallet.

You're not sending money out of your EVM wallet - you're authorizing your Algorand x EVM account to act on Algorand. There is no gas fee on the EVM side; the only network fee is the standard Algorand transaction fee (typically 0.001 ALGO).

Something not working as expected? Try [Troubleshooting](/docs/troubleshooting).

## Before You Sign

Your wallet has not committed to anything until you click Sign. If something looks off, just reject - no transaction is submitted, no fee is paid. A few quick checks:

- The recipient address matches what you intended
- The amount and asset are what you expected
- **The transaction ID shown in your wallet matches the one in the transaction review panel.**

## Group Transactions

Some actions bundle several Algorand transactions that must succeed or fail together - for example, opting into an asset and receiving it in one step, or a swap that touches multiple contracts.

When this happens:

- Your wallet asks you to sign **once** for the whole bundle
- Either every transaction in the bundle goes through, or none of them do

This is the same atomic-group behavior native Algorand wallets use - the only difference is that the signature comes from your EVM wallet.

---

## Under the Hood

The rest of this page covers the technical side - useful if you're curious or integrating against Algorand x EVM.

### EIP-712 Typed Data

Algorand x EVM uses [EIP-712 typed data](https://eips.ethereum.org/EIPS/eip-712) rather than `personal_sign` or raw byte signing. The signing prompt your wallet displays includes:

- A **domain** identifying Algorand x EVM, so a signature cannot be replayed against another dApp
- The **transaction ID** (single transaction or group ID for atomic groups)

The ID is a cryptographic commitment to the exact transaction(s) being submitted - the addresses, amounts, fees, asset IDs, notes, and every other field. If a single byte changes, the ID changes, and your signature is no longer valid for it.

### On-Chain Verification

Once signed, the signature and transaction(s) are submitted to Algorand:

1. The Algorand Smart Account verifies the ECDSA signature using the [`ecdsa_pk_recover`](https://dev.algorand.co/reference/algorand-teal/opcodes/#ecdsa_pk_recover) opcode
2. It derives the EVM address from the recovered public key and checks it matches the address bound to the account
3. If it matches, the transaction executes; if not, it is rejected

The signature is single-use - it commits to a specific transaction or group ID and cannot be replayed against any other transaction.

### Hardware Wallets

All major hardware wallets (Ledger, Trezor, etc.) support EIP-712 typed data signing through their EVM wallet integrations. If your wallet can sign EIP-712 messages on Ethereum, it works the same way here.

## Related

- [Security Model](/docs/security) - how on-chain verification keeps your assets safe
- [Send & Receive](/docs/send-receive) - using your account day-to-day
- [FAQ](/docs/faq) - common questions about signing and EIP-712

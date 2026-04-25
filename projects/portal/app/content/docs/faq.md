---
title: FAQ
description: Frequently asked questions about Algorand x EVM.
order: 9
category: Advanced
---

# Frequently Asked Questions

## General

### What happens if I lose access to MetaMask?

Recover MetaMask with your seed phrase. Since your Algorand address is derived from your EVM address, you'll regain access to the exact same Algorand account and all its assets.

### Can I use the same EVM address on multiple devices?

Yes. Your derived Algorand address is the same regardless of which device you use. As long as you're signed into the same EVM account, you can access your Algorand assets from any device.

### Is Algorand x EVM a custodial service?

No. The app never has access to your private keys. All signing happens in MetaMask. The app only builds transactions and submits signed ones to the Algorand network.

### Can I use a hardware wallet?

If your EVM wallet supports hardware wallets, then yes. Major hardware wallets (Ledger, Trezor) support EIP-712.

### Are there any extra fees?

No. You pay the standard Algorand transaction fee (typically 0.001 ALGO). There are no additional protocol fees, subscription fees, or hidden charges.

## Technical

### Why EIP-712 instead of personal_sign?

EIP-712 provides **structured, human-readable** signing prompts in MetaMask. This lets you see exactly what you're approving, rather than signing opaque hex data. It also ensures **domain separation** between AVM and EVM, as the generated signature would only be useful in an Algorand x EVM context.

### Can I interact with Algorand smart contracts?

Yes. Algorand x EVM accounts are implemented as [Smart Signature Accounts](https://dev.algorand.co/concepts/accounts/overview/#smart-signature-accounts-contract-accounts), which are a first-class account type on Algorand. They can sign any kind of transaction without limitations.

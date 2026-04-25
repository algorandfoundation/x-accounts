---
title: Manage Assets
description: How to opt into, view, and manage Algorand Standard Assets (ASAs).
order: 6
category: Using the App
---

# Manage Assets

Algorand Standard Assets (ASAs) are tokens on the Algorand blockchain - similar to ERC-20 tokens on Ethereum, but with some key differences.

## Opting In

On Algorand, you must **opt in** to an asset before you can receive it. This is a security feature that prevents spam tokens from cluttering your account.

To opt in:

1. Open the **Manage** panel
2. Enter the **ASA ID** or the **Asset name** of the asset you want to receive
3. Click **Opt In**
4. Approve the MetaMask signature

Opting in sends a 0-amount transfer of the asset to yourself. It increases your minimum balance by 0.1 ALGO.

Searching by Asset name works for [Pera verified assets](https://explorer.perawallet.app/asa-verification/) on Mainnet.

## Viewing Your Assets

The **Assets** list on the **Manage** panel shows all assets you've opted into, along with:

- Asset name and ID
- Your balance

## Opting Out

If you no longer want to hold an asset, you can opt out:

Before opting out, make sure that either your asset balance is zero, or that you are willing to send your remaining balance to another account.

1. Open the **Manage** panel
2. Select the **[↗]** button next to the asset
3. Select **MAX** amount
4. Select **Opt-out**
5. Sign the transaction.

Opting out removes the ability to receive the asset and frees up 0.1 ALGO from your minimum balance requirement.

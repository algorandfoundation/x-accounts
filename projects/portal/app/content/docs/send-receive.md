---
title: Send & Receive
description: How to send and receive ALGO and ASAs with your Algorand x EVM account.
order: 5
category: Using the App
---

# Send & Receive

## Receiving

To receive ALGO or ASAs:

1. Open the **Receive** panel
2. Share your Algorand address or QR code with the sender
3. Funds arrive in ~3 seconds once the sender submits the transaction

Your derived Algorand address is publicly shareable - just like an Ethereum address, knowing the address alone does not grant anyone access to your funds.

## Sending ALGO

1. Open the **Send** panel
2. Enter the recipient's Algorand address
3. Enter the amount of ALGO to send
4. Click **Send**
5. MetaMask will show an **EIP-712 signing request** - review the details and approve
6. The transaction is submitted to the Algorand network

### What You Sign

When MetaMask asks you to sign, you'll see a typed data message containing:

- The **transaction group ID** or **transaction ID**
- This is the cryptographic commitment to the exact transaction(s) being submitted

The Smart Account on Algorand verifies that your EVM signature matches the transaction payload. No one can alter the transaction after you sign.

## Sending ASAs

Sending Algorand Standard Assets works the same way:

1. Open the **Send** panel
2. Select the asset from the dropdown
3. Enter the recipient address and amount
4. Approve the MetaMask signature

> **Important:** The recipient must have **opted into** the ASA before they can receive it. If they haven't, the transaction will fail.

## Group Transactions

Some operations (like opting into an ASA and receiving it in one flow) may require **group transactions** - multiple transactions that execute atomically. When this happens:

- MetaMask will ask you to sign once for the entire group
- Either all transactions succeed or none do
- The signature covers the group ID, ensuring all transactions are linked

---
title: Fund Your Account
description: How to get ALGO into your xChain Account.
order: 3
category: Using the App
---

# Fund Your Account

Your derived Algorand account starts with a zero balance. Before you can send transactions, you need to fund it with at least the **minimum balance** required by Algorand (currently 0.1 ALGO for a basic account).

## Option 1: Bridge from EVM

If you have stablecoins (USDC, USDT, or USDe) on an EVM chain, you can bridge them directly to your Algorand account - **even if your account has zero balance**. The bridge automatically bootstraps your account with enough ALGO to cover the minimum balance and opt-in fees, so you don't need to fund it first.

1. Open the **Bridge** panel in the app
2. Select the source chain and token
3. Enter the amount and review the quote
4. Approve the transaction in your wallet
5. Wait for cross-chain confirmation (typically 1–5 minutes depending on the source chain)

Bridging is powered by [Allbridge](https://allbridge.io/) and works in both directions - you can bridge from EVM to Algorand and from Algorand back to EVM. Currently, you can only bridge to and from your own EVM accounts on the supported networks.

<details>
<summary>Supported Networks</summary>

| Network   | Chain | Tokens           |
| --------- | ----- | ---------------- |
| Ethereum  | ETH   | USDC, USDT, USDe |
| Arbitrum  | ARB   | USDC, USDT, USDe |
| Optimism  | OPT   | USDC, USDT       |
| Base      | BAS   | USDC             |
| Polygon   | POL   | USDC, USDT       |
| Avalanche | AVA   | USDC, USDT       |
| BNB Chain | BSC   | USDC, USDT       |
| Celo      | CEL   | USDT             |
| Sonic     | SNC   | USDC             |
| Unichain  | UNI   | USDC, USDT       |
| Linea     | LIN   | USDC             |
| Algorand  | ALG   | USDC             |

> Available tokens and routes depend on Allbridge liquidity and may change.

</details>

## Option 2: Buy ALGO from an Exchange

You can purchase ALGO on a centralized exchange and withdraw it directly to your derived Algorand address. ALGO is available on most major exchanges, including Binance, Coinbase, Kraken, and KuCoin.

1. Buy ALGO on the exchange of your choice
2. Copy your derived Algorand address from the **Receive** panel in the app
3. Withdraw ALGO from the exchange to that address
4. Funds typically arrive within a few minutes depending on the exchange

For a full list of exchanges that support ALGO, see the [Algorand Start Here](https://algorand.co/algorand-start-here#hs_cos_wrapper_widget_1769533007886) page.

## Option 3: Send from Another Algorand Wallet

If you already have ALGO in a Pera, Defly, or other Algorand wallet:

1. Open the **Receive** panel in xChain EVM to see your address
2. Open your other wallet and send ALGO to that address
3. The transfer confirms in ~3 seconds

## Option 4: TestNet Faucet

For testing, use the official Algorand TestNet faucet:

1. Copy your derived Algorand address from the app (use the **Receive** panel)
2. Go to the [Algorand TestNet Faucet](https://lora.algokit.io/testnet/fund)
3. Paste your address and request funds
4. Funds should arrive within a few seconds

## Minimum Balances

Algorand accounts must maintain a minimum balance:

| Account State    | Minimum Balance |
| ---------------- | --------------- |
| Basic account    | 0.1 ALGO        |
| Per opted-in ASA | +0.1 ALGO       |
| Per app opt-in   | +0.1 ALGO       |

For example, if you opt into 3 ASAs, your minimum balance is 0.4 ALGO. Any amount above the minimum is available for transactions.

## Transaction Fees

Algorand transaction fees are extremely low - typically **0.001 ALGO** (1000 microAlgo) per transaction. Even a small amount of ALGO will cover many transactions.

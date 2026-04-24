# Early Adopter Integration Guide

In case you want to experiment with Algo x EVM accounts in your frontend:

> [!IMPORTANT]
> **DO NOT PERFORM PUBLIC BETA TESTING YET**
>
> **The logic sig standard may still evolve, which would impact the ALGO x EVM derived addresses. If you onboard public beta testers, future changes would require you to support them in recovering funds from outdated derivations or migrate to the latest version.**
>
> Tools aiding migrations/recovery will not be in scope for this project while it is in alpha/unstable state.
>
> Private testing is fine, so long as you are aware that future versions may derive different Algorand addresses, and you would need to recover your own funds with the corresponding version of this repo.

## 0. Remove deprecated packages

If you previously installed `@d13co/liquid-ui` or `liquid-accounts-evm`, remove them before proceeding.

## 1. Install packages

Use npm aliases to install the experimental `@d13co` builds under the `@txnlab` package names. This way your imports stay as `@txnlab/use-wallet-react` — no find-and-replace needed.

**Required (RainbowKit for EVM wallet connection):**

```bash
# pnpm
pnpm add @txnlab/use-wallet@npm:@d13co/use-wallet@latest \
         @txnlab/use-wallet-react@npm:@d13co/use-wallet-react@latest \
         @txnlab/use-wallet-ui-react@npm:@d13co/use-wallet-ui-react@latest \
         algo-x-evm-sdk@latest @d13co/algo-x-evm-ui@latest @rainbow-me/rainbowkit
```

```bash
# npm
npm install @txnlab/use-wallet@npm:@d13co/use-wallet@latest \
            @txnlab/use-wallet-react@npm:@d13co/use-wallet-react@latest \
            @txnlab/use-wallet-ui-react@npm:@d13co/use-wallet-ui-react@latest \
            algo-x-evm-sdk@latest @d13co/algo-x-evm-ui@latest @rainbow-me/rainbowkit
```

```bash
# yarn
yarn add @txnlab/use-wallet@npm:@d13co/use-wallet@latest \
         @txnlab/use-wallet-react@npm:@d13co/use-wallet-react@latest \
         @txnlab/use-wallet-ui-react@npm:@d13co/use-wallet-ui-react@latest \
         algo-x-evm-sdk@latest @d13co/algo-x-evm-ui@latest @rainbow-me/rainbowkit
```

**Recommended (Allbridge cross-chain bridge support):**

```bash
pnpm add @allbridge/bridge-core-sdk
# npm install @allbridge/bridge-core-sdk
# yarn add @allbridge/bridge-core-sdk
```

**Recommended (Deflex DEX aggregator for swap support):**

```bash
pnpm add @deflex/deflex-sdk-js algosdk
# npm install @deflex/deflex-sdk-js algosdk
# yarn add @deflex/deflex-sdk-js algosdk
```

Note: This uses use-wallet v4. Migration should be straightforward/painless if you are on v2 or v3:

- https://txnlab.gitbook.io/use-wallet/v3/guides/migrating-from-v2.x
- https://txnlab.gitbook.io/use-wallet/guides/migrating-from-v3.x

## 2. Usage

1. Add global polyfills for the bridge SDK (at the top of your entry file)
2. Create a wagmi config with `algorandChain` from `algo-x-evm-sdk`
3. Add `WalletId.RAINBOWKIT` to your `WalletManager`, passing `wagmiConfig`
4. Pass `wagmiConfig` to `WalletUIProvider` — it auto-wires `WagmiProvider`, `RainbowKitProvider`, and the bridge component internally
5. Place `<WalletButton />` as your connect/account button

```tsx
// At the top of your entry file (e.g. main.tsx)
// Required by the Allbridge bridge SDK
if (!(globalThis as any).TronWebProto) {
  ;(globalThis as any).TronWebProto = { Transaction: {} }
}

// ...other imports...
import { WalletProvider, WalletManager, WalletId, NetworkId } from '@txnlab/use-wallet-react'
import { WalletUIProvider, WalletButton } from '@txnlab/use-wallet-ui-react'
import { algorandChain } from 'algo-x-evm-sdk'
// Custom getDefaultConfig from use-wallet-ui-react instead of rainbowkit
// removes the Base Account web wallet from the default list (not supported)
import { getDefaultConfig } from '@txnlab/use-wallet-ui-react/rainbowkit'
// styling for use-wallet-ui and rainbowkit
// see also https://github.com/TxnLab/use-wallet-ui/blob/2e196e9059a7ddc9dcce5a394df6773207df6289/README.md#customization
import '@txnlab/use-wallet-ui-react/dist/style.css'
import '@rainbow-me/rainbowkit/styles.css'

// Create wagmi config with the Algorand EVM chain
// replace values with your project name and WC ID
const wagmiConfig = getDefaultConfig({
  appName: 'My Algo x EVM App',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // from cloud.walletconnect.com
  chains: [algorandChain],
  // debug: true, // logs wagmi state changes, connector events, and EIP-1193 RPC traffic
})

const walletManager = new WalletManager({
  wallets: [
    {
      id: WalletId.RAINBOWKIT,
      options: { wagmiConfig },
    },
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.EXODUS,
    // WalletId.LUTE, WalletId.KMD, etc.
  ],
  defaultNetwork: NetworkId.MAINNET,
})

function Root() {
  return (
    <WalletProvider manager={walletManager}>
      {/* Pass wagmiConfig — WalletUIProvider sets up WagmiProvider,
          RainbowKitProvider, and the bridge component automatically */}
      <WalletUIProvider theme="system" wagmiConfig={wagmiConfig}>
        {/* your app */}
          {/* somewhere in header */}
            <WalletButton />
      </WalletUIProvider>
    </WalletProvider>
  )
}
```

`WalletUIProvider` must be nested inside `WalletProvider`. It handles:

- Transaction review dialogs (before signing)
- Wallet Management UI (send ALGO, asset optins)
- RainbowKit/Wagmi provider setup (when `wagmiConfig` is passed)
- Theme injection (`'light'` | `'dark'` | `'system'`)
- Optional `queryClient` prop if you already have a `@tanstack/react-query` provider

### Network switching

If your app supports multiple networks, call `walletManager.setActiveNetwork(network)` when the user switches. This updates internal state and reinitializes connections:

```tsx
function setNetwork(network: 'localnet' | 'testnet' | 'mainnet') {
  localStorage.setItem('algorand-network', network)
  walletManager.setActiveNetwork(network)
}
```

## 3. Swap (Deflex)

`WalletButton` exposes a `swap` prop that, when provided, enables the Swap panel inside **⚡ Manage → Swap**. The panel is router-agnostic — it just needs two adapters: `fetchQuote` (returns a displayable quote) and `executeSwap` (signs + submits the underlying transactions). The snippet below wires it up against Deflex.

The `fetchQuote` adapter maps Deflex's response onto the panel's `SwapQuoteDisplay` shape. Stash the raw Deflex quote on the returned object (prefixed `_deflex`) so `executeSwap` can hand it back to `getSwapQuoteTransactions`.

`executeSwap` should call `onSigned()` the moment the wallet returns the signatures, before broadcasting — this flips the panel from "awaiting signature" to "sending".

```tsx
import { useCallback, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletButton, type UseSwapOptions } from '@txnlab/use-wallet-ui-react'
import { DeflexClient } from '@deflex/deflex-sdk-js' // adjust import to the actual Deflex SDK export
import algosdk from 'algosdk'

// Initialize once at module scope (not on every render)
const deflex = new DeflexClient({
  apiKey: 'YOUR_DEFLEX_API_KEY',
  network: 'mainnet',
})

function AppContent() {
  const { signTransactions, algodClient } = useWallet()

  const swapOptions = useMemo<UseSwapOptions>(() => ({
    // 1. Quote: fetch from Deflex and adapt to the panel's display shape
    fetchQuote: async ({ fromASAID, toASAID, amount, address: _address }) => {
      const dq = await deflex.getFixedInputSwapQuote(fromASAID, toASAID, amount)
      return {
        quote: BigInt(dq.quote),          // expected output, base units
        amount: BigInt(amount),            // original input, base units
        usdIn: dq.usdIn ?? 0,
        usdOut: dq.usdOut ?? 0,
        userPriceImpact: dq.priceImpact,
        flattenedRoute: dq.flattenedRoute ?? {},
        route: dq.route ?? [],
        // Keep the raw Deflex quote so executeSwap can submit it
        _deflex: dq,
      } as any
    },

    // 2. Execute: fetch transactions, sign (preserving logic sig blobs), submit
    executeSwap: async ({ quote, address, slippage, onSigned }) => {
      const dq = (quote as any)._deflex
      const txnGroup = await deflex.getSwapQuoteTransactions(address, dq.txnPayload, slippage)

      // Decode unsigned txns; leave pre-signed logic sig blobs as-is
      const decoded = txnGroup.txns.map((t: any) =>
        t.logicSigBlob !== false
          ? null
          : algosdk.decodeUnsignedTransaction(new Uint8Array(Buffer.from(t.data, 'base64'))),
      )
      const indexesToSign = decoded.flatMap((t, i) => (t ? [i] : []))

      // signTransactions returns (Uint8Array | null)[] — nulls for skipped indexes
      const signed = await signTransactions(
        decoded.map((t, i) => t ?? txnGroup.txns[i].data),
        indexesToSign,
      )

      // Fire onSigned the moment the wallet returns, before broadcasting
      onSigned?.()

      const submission = signed.map((s, i) =>
        s ?? new Uint8Array(Buffer.from(txnGroup.txns[i].logicSigBlob, 'base64')),
      )
      const { txid } = await algodClient.sendRawTransaction(submission).do()
      const result = await algosdk.waitForConfirmation(algodClient, txid, 10)
      return {
        confirmedRound: BigInt(result.confirmedRound ?? 0),
        txIds: [txid],
      }
    },
  }), [signTransactions, algodClient])

  return <WalletButton swap={swapOptions} />
}
```

Notes:

- Initialize the Deflex client **outside** the component (module scope) so API caches aren't rebuilt on every render.
- The panel treats `quote` as an opaque pass-through — only the display fields (`quote`, `amount`, `usdIn`, `usdOut`, `userPriceImpact`, `flattenedRoute`, `route`) are read by the UI; the rest is round-tripped back into `executeSwap`.
- Consult the [Deflex SDK docs](https://www.npmjs.com/package/@deflex/deflex-sdk-js) for the exact client constructor, quote response fields, and `getSwapQuoteTransactions` return shape — these may differ across SDK versions.
- If you render the panel directly via `ManagePanel` + `useSwapPanel` (as the portal does), the same `swapOptions` object is passed to `useSwapPanel(wallet, swapOptions, assetHoldings, registry)`. See `projects/portal/app/components/app/wallet-dashboard.tsx` for a full reference.

## 4. Manage Algo x EVM Account

After connecting your EVM account, you can manage it via:

`{WalletButton}` → ⚡ Manage

To opt in to ASAs, use the `Receive` view.

## 5. Allbridge (cross-chain bridge)

The bridge UI is built into `WalletUIProvider`. No additional setup is required beyond installing `@allbridge/bridge-core-sdk`.

The `buffer` package and `TronWebProto` stub in your entry file are required by Allbridge's bundled TronWeb dependency.

Access it from `{WalletButton}` → ⚡ Manage → # Bridge

## 6. Swap (on-chain asset routing)

The Swap panel lives inside the `{WalletButton}` → ⚡ Manage → # Swap tab. It is opt-in: if `WalletUIProvider` doesn't receive a `swap` prop, the tab is hidden.

To enable it, wire up an on-chain router (e.g. [`@txnlab/haystack-router`](https://www.npmjs.com/package/@txnlab/haystack-router)) and pass a `UseSwapOptions` object to `WalletUIProvider`.

### Install

```bash
pnpm add @txnlab/haystack-router
# npm install @txnlab/haystack-router
# yarn add @txnlab/haystack-router
```

### Configure

`UseSwapOptions` has two callbacks:

- `fetchQuote(params)` — returns a quote from your router
- `executeSwap({ quote, address, slippage, onSigned })` — builds the swap, signs it with the connected wallet, submits it, and returns a transaction id

Because `executeSwap` needs `signTransactions` from `useWallet()`, build the config inside a component that lives under `<WalletProvider>`. `@txnlab/use-wallet-ui-react` ships a `getSwapConfig()` helper that wires up a Haystack `RouterClient` and the wallet signer for you:

```tsx
import { useMemo, type ReactNode } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletUIProvider, getSwapConfig } from '@txnlab/use-wallet-ui-react'
import { RouterClient } from '@txnlab/haystack-router'

const haystackRouter = new RouterClient({
  apiKey: 'YOUR_HAYSTACK_API_KEY',
  autoOptIn: true,
})

function WalletUIWithSwap({ children }: { children: ReactNode }) {
  const { signTransactions } = useWallet()
  const swap = useMemo(
    () => getSwapConfig({ router: haystackRouter, signTransactions }),
    [signTransactions],
  )

  return (
    <WalletUIProvider theme="system" wagmiConfig={wagmiConfig} swap={swap}>
      {children}
    </WalletUIProvider>
  )
}

function Root() {
  return (
    <WalletProvider manager={walletManager}>
      <WalletUIWithSwap>
        {/* your app */}
      </WalletUIWithSwap>
    </WalletProvider>
  )
}
```

`getSwapConfig()` returns a `UseSwapOptions` object. Internally it wires `fetchQuote` to `router.newQuote`, and `executeSwap` to `router.newSwap(...).execute()` — wrapping the wallet signer so the `onSigned` hook fires the moment the wallet returns, transitioning the panel from "signing" to "sending" before submit + confirmation.

If you already construct the swap options yourself (lower-level `useSwapPanel` integration, custom router), you can still hand-roll `UseSwapOptions` without the helper.

Once `swap` is on the provider, the Swap tab shows up automatically inside `<WalletButton />` — no per-button prop required.

Access it from `{WalletButton}` → ⚡ Manage → # Swap

## Troubleshooting

### `Buffer` errors

Install `buffer`

```bash
pnpm add buffer
# npm install buffer
# yarn add buffer
```

Add the `buffer` polyfill:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
})
```

```tsx
// At the top of your entry file (e.g. main.tsx)
// Required by the Allbridge bridge SDK
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer
if (!(globalThis as any).TronWebProto) {
  ;(globalThis as any).TronWebProto = { Transaction: {} }
}
```

### Package resolution errors

Add deduplication entries:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@txnlab/use-wallet-react',
      'wagmi',
      '@wagmi/core',
      '@rainbow-me/rainbowkit',
    ],
  },
})
```

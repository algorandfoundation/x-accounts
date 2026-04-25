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

**Recommended (Haystack router for swap support):**

```bash
pnpm add @txnlab/haystack-router
# npm install @txnlab/haystack-router
# yarn add @txnlab/haystack-router
```

Note: This uses use-wallet v4. Migration should be straightforward/painless if you are on v2 or v3:

- https://txnlab.gitbook.io/use-wallet/v3/guides/migrating-from-v2.x
- https://txnlab.gitbook.io/use-wallet/guides/migrating-from-v3.x

## 2. Usage

1. Add global polyfills for the bridge SDK (at the top of your entry file)
2. Create a wagmi config with `algorandChain` from `algo-x-evm-sdk`
3. Add `WalletId.RAINBOWKIT` to your `WalletManager`, passing `wagmiConfig`
4. Wrap your app in `<WalletUIProvider wagmiConfig={wagmiConfig} swapRouter={haystackRouter}>` — it auto-wires `WagmiProvider`, `RainbowKitProvider`, the bridge component, and (with `swapRouter`) the Swap tab
5. Place `<WalletButton />` as your connect/account button

`WalletUIProvider` reads `signTransactions` from the surrounding `<WalletProvider>` itself — no wrapper component needed. If you don't want the Swap tab, omit `swapRouter` (and the router instance and its import).

```tsx
// At the top of your entry file (e.g. main.tsx)
// Required by the Allbridge bridge SDK
if (!(globalThis as any).TronWebProto) {
  ;(globalThis as any).TronWebProto = { Transaction: {} }
}

// ...other imports...
import {
  WalletProvider, WalletManager, WalletId, NetworkId,
} from '@txnlab/use-wallet-react'
import {
  WalletUIProvider, WalletButton,
} from '@txnlab/use-wallet-ui-react'
import { algorandChain } from 'algo-x-evm-sdk'
// Custom getDefaultConfig from use-wallet-ui-react instead of rainbowkit
// removes the Base Account web wallet from the default list (not supported)
import { getDefaultConfig } from '@txnlab/use-wallet-ui-react/rainbowkit'
// styling for use-wallet-ui and rainbowkit
// see also https://github.com/TxnLab/use-wallet-ui/blob/2e196e9059a7ddc9dcce5a394df6773207df6289/README.md#customization
import '@txnlab/use-wallet-ui-react/dist/style.css'
import '@rainbow-me/rainbowkit/styles.css'
// Swap router — omit this import (and the haystackRouter module-scope
// instance below) if you don't want the Swap tab.
import { RouterClient } from '@txnlab/haystack-router'

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

// Swap: module-scope router instance so caches aren't rebuilt per render.
// Omit this block — and `swapRouter={...}` below — if you don't want the Swap tab.
const haystackRouter = new RouterClient({
  apiKey: 'YOUR_HAYSTACK_API_KEY',
  autoOptIn: true,
})

function Root() {
  return (
    <WalletProvider manager={walletManager}>
      <WalletUIProvider theme="system" wagmiConfig={wagmiConfig} swapRouter={haystackRouter}>
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
- Swap tab (when `swapRouter` is passed — or pre-built `swap` options)
- Theme injection (`'light'` | `'dark'` | `'system'`)
- Optional `queryClient` prop if you already have a `@tanstack/react-query` provider

The Swap tab wires `fetchQuote` to `router.newQuote` and `executeSwap` to `router.newSwap(...).execute()`, using the wallet signer from `<WalletProvider>`. The `onSigned` hook fires the moment the wallet returns so the panel transitions from "signing" to "sending" before submit + confirmation. Consumers who need to intercept the signer or consume `UseSwapOptions` outside `WalletUIProvider` can pre-build the options themselves with `useHaystackSwapConfig({ router })` and pass the result as the `swap` prop instead of `swapRouter`.

### Network switching

If your app supports multiple networks, call `walletManager.setActiveNetwork(network)` when the user switches. This updates internal state and reinitializes connections:

```tsx
function setNetwork(network: 'localnet' | 'testnet' | 'mainnet') {
  localStorage.setItem('algorand-network', network)
  walletManager.setActiveNetwork(network)
}
```

## 3. Manage Algo x EVM Account

After connecting your EVM account, you can manage it via:

`{WalletButton}` → ⚡ Manage

To opt in to ASAs, use the `Receive` view.

## 4. Allbridge (cross-chain bridge)

The bridge UI is built into `WalletUIProvider`. No additional setup is required beyond installing `@allbridge/bridge-core-sdk`.

The `buffer` package and `TronWebProto` stub in your entry file are required by Allbridge's bundled TronWeb dependency.

Access it from `{WalletButton}` → ⚡ Manage → # Bridge

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

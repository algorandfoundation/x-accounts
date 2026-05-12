# Early Adopter Integration Guide

> [!IMPORTANT]
>
> The xChain Accounts protocol is in Beta.
>
> Currently, only React frontends are supported.

Interested in integrating xChain Accounts? Consider filling in a [quick survey](https://forms.gle/qjY5hLREzem6Wrvk6).

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
import { WalletProvider, WalletManager, WalletId, NetworkId } from "@txnlab/use-wallet-react"
import { WalletUIProvider, WalletButton } from "@txnlab/use-wallet-ui-react"
import { algorandChain } from "algo-x-evm-sdk"
// Custom getDefaultConfig from use-wallet-ui-react instead of rainbowkit
// removes the Base Account web wallet from the default list (not supported)
import { getDefaultConfig } from "@txnlab/use-wallet-ui-react/rainbowkit"
// styling for use-wallet-ui and rainbowkit
// see also https://github.com/TxnLab/use-wallet-ui/blob/2e196e9059a7ddc9dcce5a394df6773207df6289/README.md#customization
import "@txnlab/use-wallet-ui-react/dist/style.css"
import "@rainbow-me/rainbowkit/styles.css"
// Swap router — omit this import (and the haystackRouter module-scope
// instance below) if you don't want the Swap tab.
import { RouterClient } from "@txnlab/haystack-router"

// Create wagmi config with the Algorand EVM chain
// replace values with your project name and WC ID
const wagmiConfig = getDefaultConfig({
  appName: "My xChain EVM App",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // from cloud.walletconnect.com
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
  apiKey: "YOUR_HAYSTACK_API_KEY",
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
function setNetwork(network: "localnet" | "testnet" | "mainnet") {
  localStorage.setItem("algorand-network", network)
  walletManager.setActiveNetwork(network)
}
```

## 3. Manage xChain Account

After connecting your EVM account, you can manage it via:

`{WalletButton}` → ⚡ Manage

To opt in to ASAs, use the `Receive` view.

## 4. Allbridge (cross-chain bridge)

The bridge UI is built into `WalletUIProvider`. No additional setup is required beyond installing `@allbridge/bridge-core-sdk`.

The `buffer` package and `TronWebProto` stub in your entry file are required by Allbridge's bundled TronWeb dependency.

Access it from `{WalletButton}` → ⚡ Manage → # Bridge

## 5. Notices (disclaimers & info dialogs)

`WalletUIProvider` accepts an optional `notices` prop that injects gating UI (or always-visible copy) in front of certain flows. There are three kinds of notices:

- **`disclaimer`** — custom text + `I understand the risks and wish to proceed` checkbox + `Accept` button. Acceptance is required to proceed.
- **`info`** — custom title/body + single `Continue` button. Acknowledged on click.
- **`footer`** — passive text rendered inline at the bottom of a host panel. Not gated, no acknowledgement.

The `disclaimer` and `info` kinds share a single `localStorage` object (`__wui_notices_ack__`) keyed by id. A missing entry means not yet acknowledged; once acknowledged, the gate is replaced by its children on the next render in every tab. The `footer` kind has no acknowledgement state. If a given id has no config, the corresponding host renders as if the notice didn't exist — every notice is fully opt-in per consumer and per id.

### Built-in ids

Five ids are auto-wired by `WalletUIProvider`. Provide a config for any of them to enable the corresponding UI; omit it to skip it entirely.

| id             | kind         | When it shows                                                                |
| -------------- | ------------ | ---------------------------------------------------------------------------- |
| `bridge`       | `disclaimer` | Inline inside the Bridge panel before the bridge UI renders                  |
| `bridgeFooter` | `footer`     | Inline footer below the Bridge submit button (always visible)                |
| `bridgeSign`   | `info`       | Inline gate replacing the Bridge submit button after each click (every time) |
| `sign`         | `info`       | Inline inside the Before-Sign dialog before the transaction review           |
| `evm-connect`  | `disclaimer` | Modal overlay after wagmi reports a fresh EVM wallet connection              |

The `evm-connect` gate is enforced — cancelling the modal calls `wagmi`'s `disconnect()` (no acknowledgement is recorded), so the gate re-appears on the next connect. `bridge` and `sign` render inline inside their host dialogs and acknowledge once. `bridgeSign` intercepts every Bridge submit click — `Continue` fires the bridge action, `Cancel` returns to the form — and is **not** persisted, so it warns on every attempt. `bridgeFooter` is purely informational and never blocks an action.

### Configuring

Pass `notices` to `WalletUIProvider`:

```tsx
import { WalletUIProvider, type NoticesConfig } from "@txnlab/use-wallet-ui-react"

const notices: NoticesConfig = {
  "evm-connect": {
    kind: "disclaimer",
    text: (
      <>
        This app is non-custodial. By connecting an EVM wallet you agree to our <a href="/terms">Terms of Service</a>{" "}
        and <a href="/privacy">Privacy Policy</a>.
      </>
    ),
  },
  bridge: {
    kind: "disclaimer",
    text: <>Cross-chain transfers are powered by Allbridge and are irreversible…</>,
  },
  sign: {
    kind: "info",
    title: "About signing",
    body: <>Review the transactions below before approving in your wallet.</>,
  },
  bridgeFooter: {
    kind: "footer",
    text: "Cross-chain transfers are facilitated by Allbridge, a third-party provider…",
  },
}

function Root() {
  return (
    <WalletProvider manager={walletManager}>
      <WalletUIProvider wagmiConfig={wagmiConfig} notices={notices}>
        {/* your app */}
      </WalletUIProvider>
    </WalletProvider>
  )
}
```

`text`, `title`, and `body` accept any `ReactNode`, so you can embed links, formatted blocks, etc. — content is rendered with the existing `--wui-color-*` theme variables.

### Custom gates in your own UI

The same primitives are re-exported from `@txnlab/use-wallet-ui-react` for app-side gating:

```tsx
import { Disclaimer, InfoDialog } from '@txnlab/use-wallet-ui-react'

// Add a config entry under your own id…
const notices: NoticesConfig = {
  'risky-action': { kind: 'disclaimer', text: <>This action is irreversible.</> },
}

// …then wrap whatever the gate should guard.
<Disclaimer id="risky-action">
  <RiskyActionPanel />
</Disclaimer>
```

`<Disclaimer>` and `<InfoDialog>` both accept an optional `className` to override the default container styling. With no matching config in `notices`, both render `children` directly.

For lower-level control, `useNotice(id)` returns `{ config, isAcknowledged, acknowledge, reset }` and re-renders on changes from any tab.

### Resetting acknowledgements

```tsx
import { clearAllNoticeAcks, readNoticeAcks, NOTICES_PERSIST_KEY } from "@txnlab/use-wallet-ui-react"

readNoticeAcks() // → { bridge: 1730000000000, sign: …, … }
clearAllNoticeAcks() // wipe every acknowledgement (all gates re-appear)
// Or per-id: useNotice('bridge').reset()
```

Acknowledgements live in `localStorage[NOTICES_PERSIST_KEY]` as `Record<id, timestamp>`; cross-tab updates propagate via the `storage` event automatically.

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
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
})
```

```tsx
// At the top of your entry file (e.g. main.tsx)
// Required by the Allbridge bridge SDK
import { Buffer } from "buffer"
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
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@txnlab/use-wallet-react",
      "wagmi",
      "@wagmi/core",
      "@rainbow-me/rainbowkit",
    ],
  },
})
```

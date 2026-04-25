import { Buffer } from 'buffer'
import { type ReactNode, useMemo } from 'react'
import { useResolvedTheme } from '~/components/theme-provider'

// Polyfills for wallet/bridge SDK dependencies (client-only via lazy load)
if (typeof window !== 'undefined') {
  ;(globalThis as any).Buffer = Buffer
  if (!(globalThis as any).TronWebProto) {
    ;(globalThis as any).TronWebProto = { Transaction: {} }
  }
}
import { WalletProvider, WalletManager, WalletId, LogLevel } from '@txnlab/use-wallet-react'
import { WalletUIProvider, type NoticesConfig } from '@txnlab/use-wallet-ui-react'
import { getDefaultConfig, createRainbowKitConfig } from '@txnlab/use-wallet-ui-react/rainbowkit'
import { algorandChain } from 'algo-x-evm-sdk'
import { RouterClient } from '@txnlab/haystack-router'

import '@rainbow-me/rainbowkit/styles.css'
import '@txnlab/use-wallet-ui-react/dist/style.css'

export const wagmiConfig = getDefaultConfig({
  appName: 'Algo x EVM Portal',
  projectId: '3404862cca4501e4d84be405269d955c',
  chains: [algorandChain],
  ssr: false,
})

// Create RainbowKit config eagerly so WalletUIProvider has it on first render
// (avoids a dynamic import cycle that restructures the tree and remounts children).
const rainbowkitConfig = createRainbowKitConfig({ wagmiConfig })

// Swap router — module-scope so caches aren't rebuilt per render. Wired into
// WalletUIProvider via `swapRouter` so every consumer reads the same config.
const haystackRouter = new RouterClient({
  apiKey: 'bd650cf4-3d73-4e3f-ad37-1ada754bd659',
  autoOptIn: true,
})

const notices: NoticesConfig = {
  'evm-connect': {
    kind: 'disclaimer',
    text: (
      <>
        <p>By connecting your wallet, you acknowledge and agree that:</p>
        <ul className="list-disc pl-5 my-2 space-y-1.5">
          <li>This application is non-custodial. We do not control or store your funds, private keys, or assets.</li>
          <li>You are solely responsible for reviewing and approving all transactions initiated from your wallet.</li>
          <li>Blockchain transactions are irreversible and cannot be undone.</li>
          <li>You are responsible for ensuring that you are interacting with the correct network, assets, and applications.</li>
          <li>
            We are not liable for any loss of funds resulting from user error, incorrect transactions, or interactions with
            third-party services or protocols.
          </li>
        </ul>
        <p>
          By continuing, you agree to our{' '}
          <a href="https://xchain.algorand.co/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-[var(--wui-color-link)] hover:text-[var(--wui-color-link-hover)]">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="https://algorand.co/algorand-foundation/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--wui-color-link)] hover:text-[var(--wui-color-link-hover)]">
            Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  bridge: {
    kind: 'disclaimer',
    text: (
      <>
        <p>
          You are about to perform a cross-chain transaction. This transaction uses <a href="https://allbridge.io/" target="_blank" rel="noopener noreferrer" className="text-[var(--wui-color-link)] hover:text-[var(--wui-color-link-hover)]">
            Allbridge
          </a>, a third-party bridging service.
          The Algorand Foundation does not control or guarantee the execution or outcome of this transaction.
        </p>
        <p className="mt-2">Please be aware:</p>
        <ul className="list-disc pl-5 my-2 space-y-1.5">
          <li>Cross-chain transfers may involve multiple steps across different blockchains.</li>
          <li>Transactions may experience delays, partial completion, or failure due to network conditions or third-party services.</li>
          <li>Smart contracts and bridging mechanisms carry inherent technical risks, including potential vulnerabilities.</li>
          <li>You may incur fees on multiple networks, which may not be recoverable if a transaction fails.</li>
          <li>Assets received on another chain may be wrapped or represented differently than the original asset.</li>
        </ul>
        <p>You are solely responsible for understanding the transaction and the associated risks.</p>
      </>
    ),
  },
  // sign: {
  //   kind: 'info',
  //   title: 'About signing transactions',
  //   body: <p>Placeholder text explaining transaction signing</p>,
  // },
}

function makeWalletManager() {
  return new WalletManager({
    options: {
      debug: false,
      logLevel: LogLevel.WARN,
      resetNetwork: true,
    },
    wallets: [
      {
        id: WalletId.RAINBOWKIT,
        options: { wagmiConfig },
      },
    ],
    defaultNetwork: 'mainnet',
  })
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const walletManager = useMemo(() => makeWalletManager(), [])
  const resolvedTheme = useResolvedTheme()

  return (
    <WalletProvider manager={walletManager}>
      <WalletUIProvider theme={resolvedTheme} rainbowkit={rainbowkitConfig} notices={notices} swapRouter={haystackRouter}>
        {children}
      </WalletUIProvider>
    </WalletProvider>
  )
}

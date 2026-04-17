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
import { WalletUIProvider } from '@txnlab/use-wallet-ui-react'
import { getDefaultConfig, createRainbowKitConfig } from '@txnlab/use-wallet-ui-react/rainbowkit'
import { algorandChain } from 'algo-x-evm-sdk'

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
      WalletId.LUTE,
    ],
    defaultNetwork: 'mainnet',
  })
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const walletManager = useMemo(() => makeWalletManager(), [])
  const resolvedTheme = useResolvedTheme()

  return (
    <WalletProvider manager={walletManager}>
      <WalletUIProvider theme={resolvedTheme} rainbowkit={rainbowkitConfig}>
        {children}
      </WalletUIProvider>
    </WalletProvider>
  )
}

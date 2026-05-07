import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useWallet, WalletId } from '@txnlab/use-wallet-react'
import { ConnectWalletButton } from '@txnlab/use-wallet-ui-react'
import { WalletProviders, wagmiConfig } from './wallet-providers'
import { WalletDashboard } from './wallet-dashboard'
import { UseAlgorandWith } from '~/components/use-algorand-with'
import { Button } from '../ui/button'

/**
 * Listens to wallet state and calls `onResolved` once we know the final
 * connection status (connected or definitively disconnected).
 * Renders nothing — lives inside WalletProviders only to access the hook.
 */
function WalletResolver({ onResolved }: { onResolved: () => void }) {
  const { activeAddress, isReady } = useWallet()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (activeAddress) {
      firedRef.current = true
      onResolved()
      return
    }
    if (!isReady) return

    // Manager is ready but no wallet connected.
    // Subscribe to wagmi status — resolve once it settles to disconnected
    // (no session to restore) or connected (Bridge will sync it).
    const check = () => {
      const { status, connections } = wagmiConfig.state
      if (status === 'disconnected' && connections.size === 0) {
        firedRef.current = true
        onResolved()
        return true
      }
      return false
    }
    // Already settled?
    if (check()) return
    // Otherwise wait for wagmi to settle
    return wagmiConfig.subscribe(
      (state) => `${state.status}:${state.connections.size}`,
      () => check(),
    )
  }, [activeAddress, isReady, onResolved])

  return null
}

function WalletAppContent() {
  const { activeAddress, wallets } = useWallet()

  // Open RainbowKit's connect modal directly, skipping the intermediate
  // ConnectWalletMenu dialog. We still go through use-wallet's connect()
  // so wagmi → use-wallet state sync, connector metadata, and the
  // 'evm-connect' disclaimer continue to work as configured.
  const handleConnect = useCallback(() => {
    const rk = wallets.find((w) => w.id === WalletId.RAINBOWKIT)
    if (!rk) return
    rk.connect().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      if (!/dismissed|cancel/i.test(message)) {
        console.warn('Wallet connect failed:', message)
      }
    })
  }, [wallets])

  return (
    <>
      {!activeAddress && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center justify-center gap-8 sm:gap-12 md:gap-16 mb-8">
            <svg className="h-20 sm:h-28 md:h-36 fill-primary" viewBox="0 0 113 113.4" aria-label="Algorand">
              <polygon points="19.6 113.4 36 85 52.4 56.7 68.7 28.3 71.4 23.8 72.6 28.3 77.6 47 72 56.7 55.6 85 39.3 113.4 58.9 113.4 75.3 85 83.8 70.3 87.8 85 95.4 113.4 113 113.4 105.4 85 97.8 56.7 95.8 49.4 108 28.3 90.2 28.3 89.6 26.2 83.4 3 82.6 0 65.5 0 65.1 0.6 49.1 28.3 32.7 56.7 16.4 85 0 113.4 19.6 113.4" />
            </svg>
            <span className="text-[72px] sm:text-[96px] md:text-[112px] font-bold bg-clip-text text-[#CCD0D3]">x</span>
            <svg className="h-20 sm:h-28 md:h-36" viewBox="420 80 1080 1760" aria-label="Ethereum">
              <path d="m959.8 80.7-539.7 895.6 539.7-245.3z" fill="#8a92b2" />
              <path d="m959.8 731-539.7 245.3 539.7 319.1z" fill="#62688f" />
              <path d="m1499.6 976.3-539.8-895.6v650.3z" fill="#62688f" />
              <path d="m959.8 1295.4 539.8-319.1-539.8-245.3z" fill="#454a75" />
              <path d="m420.1 1078.7 539.7 760.6v-441.7z" fill="#8a92b2" />
              <path d="m959.8 1397.6v441.7l540.1-760.6z" fill="#62688f" />
            </svg>
          </div>
          <UseAlgorandWith className="mb-2 text-center" />
          <p className="mx-auto mb-2 max-w-2xl text-lg text-muted-foreground">
            No new wallet needed, no setup. Just connect any EVM wallet to send transactions, manage assets, swap and
            bridge on Algorand.
          </p>
          <div data-wallet-ui className="flex flex-col gap-2 justify-center mb-8">
            <ConnectWalletButton className="rounded-md" onClick={handleConnect} />
            <Button variant="outline" size="lg" asChild>
              <Link to="/docs">Read the Docs</Link>
            </Button>
          </div>
        </div>
      )}
      <WalletDashboard />
    </>
  )
}

export default function WalletApp() {
  const [resolved, setResolved] = useState(false)
  const onResolved = useCallback(() => setResolved(true), [])

  const content = useMemo(() => {
    if (!resolved) {
      return (
        <>
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
          <WalletResolver onResolved={onResolved} />
        </>
      )
    }
    return <WalletAppContent />
  }, [resolved, onResolved])

  return <WalletProviders>{content}</WalletProviders>
}

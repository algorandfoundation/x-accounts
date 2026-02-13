import { useStore } from '@tanstack/react-store'
import {
  WalletManager,
  type BaseWallet,
  type WalletAccount,
  type WalletKey
} from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import * as React from 'react'

interface IWalletContext {
  manager: WalletManager
}

const WalletContext = React.createContext<IWalletContext | undefined>(undefined)

interface WalletProviderProps {
  manager: WalletManager
  children: React.ReactNode
}

export const WalletProvider = ({ manager, children }: WalletProviderProps) => {
  const resumedRef = React.useRef(false)

  React.useEffect(() => {
    if (!resumedRef.current) {
      manager.resumeSessions()
      resumedRef.current = true
    }
  }, [manager])

  return (
    <WalletContext.Provider value={{ manager }}>
      {children}
    </WalletContext.Provider>
  )
}

export interface Wallet {
  id: string
  walletKey: WalletKey
  metadata: { name: string; icon: string }
  accounts: WalletAccount[]
  activeAccount: WalletAccount | null
  isConnected: boolean
  isActive: boolean
  connect: (args?: Record<string, any>) => Promise<WalletAccount[]>
  disconnect: () => Promise<void>
  setActive: () => void
  setActiveAccount: (address: string) => void
}

export const useWallet = () => {
  const context = React.useContext(WalletContext)

  if (!context) {
    throw new Error('useWallet must be used within the WalletProvider')
  }

  const { manager } = context

  const walletStateMap = useStore(manager.store, (state) => state.wallets)
  const activeWalletId = useStore(manager.store, (state) => state.activeWallet)

  const transformToWallet = React.useCallback(
    (wallet: BaseWallet): Wallet => {
      const walletState = walletStateMap[wallet.walletKey]
      return {
        id: wallet.id,
        walletKey: wallet.walletKey,
        metadata: wallet.metadata,
        accounts: walletState?.accounts ?? [],
        activeAccount: walletState?.activeAccount ?? null,
        isConnected: !!walletState,
        isActive: wallet.walletKey === activeWalletId,
        connect: (args) => wallet.connect(args),
        disconnect: () => wallet.disconnect(),
        setActive: () => wallet.setActive(),
        setActiveAccount: (addr) => wallet.setActiveAccount(addr)
      }
    },
    [walletStateMap, activeWalletId]
  )

  const wallets = React.useMemo(() => {
    return [...manager.wallets.values()].map(transformToWallet)
  }, [manager, transformToWallet])

  const activeBaseWallet = activeWalletId ? manager.getWallet(activeWalletId) || null : null
  const activeWallet = React.useMemo(() => {
    return activeBaseWallet ? transformToWallet(activeBaseWallet) : null
  }, [activeBaseWallet, transformToWallet])

  const activeAccount = activeWallet?.activeAccount ?? null

  const signTransactions = <T extends algosdk.Transaction[] | Uint8Array[]>(
    txnGroup: T | T[],
    indexesToSign?: number[]
  ): Promise<(Uint8Array | null)[]> => {
    if (!activeBaseWallet) {
      throw new Error('No active wallet')
    }
    return activeBaseWallet.signTransactions(txnGroup, indexesToSign)
  }

  const transactionSigner: algosdk.TransactionSigner | null = activeBaseWallet
    ? activeBaseWallet.transactionSigner
    : null

  return {
    wallets,
    activeWallet,
    activeAccount,
    signTransactions,
    transactionSigner
  }
}

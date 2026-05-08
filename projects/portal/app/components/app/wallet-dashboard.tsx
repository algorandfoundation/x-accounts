import { useMemo, useState, useCallback } from "react"
import { useWallet, useNetwork } from "@txnlab/use-wallet-react"
import { useQueryClient, useIsFetching } from "@tanstack/react-query"
import { useAccountInfo, useBridgeDialog, mapBridgeToPanelProps, useWalletUI } from "@txnlab/use-wallet-ui-react"
import { getOpenInEntries, type Network } from "@d13co/open-in"
import {
  ManagePanel,
  useSendPanel,
  useReceivePanel,
  useSwapPanel,
  useAssetRegistry,
  useAssets,
  usePeraAssetData,
  type WalletAdapter,
  type AssetHoldingDisplay,
  type AssetLookupClient,
} from "@d13co/algo-x-evm-ui"

export function WalletDashboard() {
  const { activeAddress, activeWallet, activeWalletAccounts, algodClient, signTransactions } = useWallet()
  const { activeNetwork } = useNetwork()
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()
  const { bridge, enableBridge } = useBridgeDialog()

  const [showAvailable, setShowAvailable] = useState(() => {
    try {
      return localStorage.getItem("portal:balance-pref") === "available"
    } catch {
      return false
    }
  })

  const { data: accountInfo } = useAccountInfo({ enabled: !!activeAddress })

  const totalBalance = useMemo(() => {
    if (!accountInfo || accountInfo.amount === undefined) return null
    return Number(accountInfo.amount) / 1_000_000
  }, [accountInfo])

  const availableBalance = useMemo(() => {
    if (!accountInfo || accountInfo.amount === undefined || accountInfo.minBalance === undefined) return null
    return Math.max(0, (Number(accountInfo.amount) - Number(accountInfo.minBalance)) / 1_000_000)
  }, [accountInfo])

  const displayBalance = showAvailable ? availableBalance : totalBalance

  const allHoldings = useMemo(() => accountInfo?.assets ?? [], [accountInfo])
  const assetIds = useMemo(() => allHoldings.map((a) => String(a.assetId)), [allHoldings])
  const optedInAssetIds = useMemo(() => new Set(allHoldings.map((a) => Number(a.assetId))), [allHoldings])

  const registry = useAssetRegistry(algodClient, activeNetwork)

  const onTransactionSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["account-info"] })
  }, [queryClient])

  const wallet: WalletAdapter = useMemo(
    () => ({
      activeAddress: activeAddress ?? null,
      algodClient: algodClient ?? null,
      signTransactions,
      onTransactionSuccess,
    }),
    [activeAddress, algodClient, signTransactions, onTransactionSuccess],
  )

  const send = useSendPanel(wallet)
  const optIn = useReceivePanel(wallet, optedInAssetIds, registry)

  const { swap: swapOptions } = useWalletUI()

  const { assets: assetInfoMap } = useAssets(assetIds, algodClient as AssetLookupClient | undefined, activeNetwork)

  const heldAssetIds = useMemo(() => allHoldings.map((a) => Number(a.assetId)), [allHoldings])
  const { peraData, fetchFor: fetchPeraFor } = usePeraAssetData(heldAssetIds, activeNetwork)

  const assetHoldings = useMemo(() => {
    const results: AssetHoldingDisplay[] = []
    for (const holding of allHoldings) {
      const info = assetInfoMap[String(holding.assetId)]
      if (!info) continue
      const raw = BigInt(holding.amount)
      let amount: string
      if (info.decimals === 0) {
        amount = raw.toString()
      } else {
        const divisor = 10n ** BigInt(info.decimals)
        const whole = raw / divisor
        const remainder = raw % divisor
        if (remainder === 0n) {
          amount = whole.toString()
        } else {
          const frac = remainder.toString().padStart(info.decimals, "0").replace(/0+$/, "")
          amount = `${whole}.${frac}`
        }
      }
      const pera = peraData.get(Number(holding.assetId))
      results.push({
        assetId: Number(holding.assetId),
        name: info.name || `ASA#${holding.assetId}`,
        unitName: info.unitName,
        amount,
        decimals: info.decimals,
        logo: pera?.logo,
        verificationTier: pera?.verificationTier,
      })
    }
    return results
  }, [allHoldings, assetInfoMap, peraData])

  // WalletUIProvider is configured with `swapRouter` at the root, so
  // `swapOptions` is always populated here.
  const swap = useSwapPanel(wallet, swapOptions!, assetHoldings, registry)

  const bridgeProps = useMemo(() => {
    if (!bridge.isAvailable) return undefined
    const { onBack: _, ...rest } = mapBridgeToPanelProps(bridge)
    return rest
  }, [bridge])

  const evmAddress = useMemo(
    () => (activeWallet?.activeAccount?.metadata?.evmAddress as string) ?? null,
    [activeWallet],
  )

  // Transaction explorer URL helper
  const getTxExplorerUrl = useCallback(
    (txId: string | null) => {
      if (!txId || !activeNetwork) return null
      const entries = getOpenInEntries(activeNetwork as Network, "transaction")
      const first = entries[0]
      if (!first) return null
      return first.getUrl(activeNetwork as Network, "transaction", txId)
    },
    [activeNetwork],
  )

  // Explore account in block explorer
  const handleExplore = useMemo(() => {
    if (!activeAddress || !activeNetwork) return undefined
    const entries = getOpenInEntries(activeNetwork as Network, "account")
    const first = entries[0]
    if (!first) return undefined
    const url = first.getUrl(activeNetwork as Network, "account", activeAddress)
    if (!url) return undefined
    return () => window.open(url, "_blank", "noopener,noreferrer")
  }, [activeAddress, activeNetwork])

  const toggleBalance = useCallback(() => {
    setShowAvailable((v) => {
      const next = !v
      try {
        localStorage.setItem("portal:balance-pref", next ? "available" : "total")
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  const walletName = useMemo(
    () => (activeWallet?.activeAccount?.metadata?.connectorName as string) || activeWallet?.metadata.name || null,
    [activeWallet],
  )

  const walletIcon = useMemo(
    () => (activeWallet?.activeAccount?.metadata?.connectorIcon as string) || activeWallet?.metadata.icon || null,
    [activeWallet],
  )

  const handleDisconnect = useCallback(async () => {
    if (activeWallet) {
      try {
        await activeWallet.disconnect()
      } catch (error) {
        console.error("Error disconnecting wallet:", error)
      }
    }
  }, [activeWallet])

  if (!activeAddress) return null

  return (
    <div>
      <ManagePanel
        wideBreakpoint={800}
        onBridgeEnter={enableBridge}
        displayBalance={displayBalance}
        showAvailableBalance={showAvailable}
        onToggleBalance={toggleBalance}
        send={{ ...send, explorerUrl: getTxExplorerUrl(send.txId) }}
        optIn={{
          ...optIn,
          evmAddress,
          explorerUrl: getTxExplorerUrl(optIn.txId),
          peraData,
          fetchPeraData: fetchPeraFor,
        }}
        swap={{
          ...swap,
          accountAssets: assetHoldings.length > 0 ? assetHoldings : undefined,
          totalBalance,
          availableBalance,
          explorerUrl: getTxExplorerUrl(swap.txId),
          peraData,
          fetchPeraData: fetchPeraFor,
        }}
        bridge={bridgeProps}
        assets={assetHoldings.length > 0 ? assetHoldings : undefined}
        totalBalance={totalBalance}
        availableBalance={availableBalance}
        onRefresh={() => queryClient.invalidateQueries()}
        isRefreshing={isFetching > 0}
        onExplore={handleExplore}
        activeAddress={activeAddress}
        evmAddress={evmAddress}
        walletName={walletName}
        walletIcon={walletIcon}
        onDisconnect={handleDisconnect}
        accounts={activeWalletAccounts?.map((a) => ({
          address: a.address,
          displayName: null,
          icon: null,
        }))}
        onAccountSwitch={activeWallet ? (addr: string) => activeWallet.setActiveAccount(addr) : undefined}
      />
    </div>
  )
}

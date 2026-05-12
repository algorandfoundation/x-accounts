// buffer and tron stubs required for bridge SDK
import { Buffer } from "buffer"
;(globalThis as unknown as Record<string, unknown>).Buffer = Buffer
// TODO figure this out
// Stub TronWeb globals required by Allbridge SDK's bundled tronweb dependency
if (!(globalThis as unknown as Record<string, unknown>).TronWebProto) {
  ;(globalThis as unknown as Record<string, unknown>).TronWebProto = { Transaction: {} }
}

import { StrictMode, useState, useEffect, useCallback, useMemo } from "react"
import { createRoot } from "react-dom/client"
import { LogLevel, WalletProvider } from "@txnlab/use-wallet-react"
import { WalletUIProvider, type Theme } from "@txnlab/use-wallet-ui-react"
import "@txnlab/use-wallet-ui-react/dist/style.css"
import { WalletManager, WalletId } from "@txnlab/use-wallet-react"
import { getDefaultConfig } from "@txnlab/use-wallet-ui-react/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"
import { algorandChain } from "algo-x-evm-sdk"
import { RouterClient } from "@txnlab/haystack-router"
import "./index.css"
import App from "./App.tsx"
import { ErrorBoundary } from "./ErrorBoundary.tsx"

const haystackRouter = new RouterClient({
  apiKey: "bd650cf4-3d73-4e3f-ad37-1ada754bd659",
  autoOptIn: true,
})

type AlgorandNetwork = "localnet" | "testnet" | "mainnet"

const wagmiConfig = getDefaultConfig({
  appName: "xChain EVM Demo",
  projectId: "3404862cca4501e4d84be405269d955c",
  chains: [algorandChain],
})

function makeWalletManager(network: AlgorandNetwork) {
  return new WalletManager({
    options: {
      debug: true,
      logLevel: LogLevel.DEBUG,
      resetNetwork: true,
    },
    wallets: [
      {
        id: WalletId.RAINBOWKIT,
        options: { wagmiConfig },
      },
      WalletId.LUTE,
      ...(network === "localnet" ? [WalletId.KMD] : []),
    ],
    defaultNetwork: network,
  })
}

function getInitialNetwork(): AlgorandNetwork {
  const stored = localStorage.getItem("algorand-network")
  if (stored === "localnet" || stored === "testnet" || stored === "mainnet") return stored
  return "mainnet"
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("app-theme")
    if (stored === "light" || stored === "dark") return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })

  const [network, setNetworkState] = useState<AlgorandNetwork>(getInitialNetwork)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const walletManager = useMemo(() => makeWalletManager(network), [])

  const setNetwork = useCallback(
    (n: AlgorandNetwork) => {
      void (async () => {
        localStorage.setItem("algorand-network", n)
        setNetworkState(n)
        // important! if multiple networks are supported, the wallet manager needs to be informed of network changes so it can update its internal state and reinitialize connections as needed
        await walletManager.setActiveNetwork(n)
        // dirty temp workaround for a network sync bug
        await sleep(100)
        window.location.reload()
      })()
    },
    [walletManager],
  )

  useEffect(() => {
    localStorage.setItem("app-theme", theme)
    document.documentElement.style.colorScheme = theme
    document.documentElement.style.color = theme === "dark" ? "#e9e9fd" : "#001324"
    document.documentElement.style.backgroundColor = theme === "dark" ? "#001324" : "#ffffff"
  }, [theme])

  return (
    <WalletProvider manager={walletManager}>
      <WalletUIProvider theme={theme} wagmiConfig={wagmiConfig} swapRouter={haystackRouter}>
        <App theme={theme} setTheme={setTheme} network={network} setNetwork={setNetwork} />
      </WalletUIProvider>
    </WalletProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)

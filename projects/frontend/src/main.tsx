// buffer and tron stubs required for bridge SDK
import { Buffer } from "buffer";
(globalThis as unknown as Record<string, unknown>).Buffer = Buffer;
// TODO figure this out
// Stub TronWeb globals required by Allbridge SDK's bundled tronweb dependency
if (!(globalThis as any).TronWebProto) {
  (globalThis as any).TronWebProto = { Transaction: {} };
}

import { StrictMode, useState, useEffect, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { LogLevel, WalletProvider } from "@txnlab/use-wallet-react";
import { WalletUIProvider, type Theme } from "@txnlab/use-wallet-ui-react";
import "@txnlab/use-wallet-ui-react/dist/style.css";
import { WalletManager, WalletId } from "@txnlab/use-wallet-react";
import { getDefaultConfig } from "@txnlab/use-wallet-ui-react/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { algorandChain } from "liquid-accounts-evm";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

type AlgorandNetwork = "localnet" | "testnet" | "mainnet";

const wagmiConfig = getDefaultConfig({
    appName: "My Liquid EVM Accounts Demo",
    projectId: "fcfde0713d43baa0d23be0773c80a72b",
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
  });
}

function getInitialNetwork(): AlgorandNetwork {
  const stored = localStorage.getItem("algorand-network");
  if (stored === "localnet" || stored === "testnet" || stored === "mainnet") return stored;
  return "localnet";
}

function Root() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("app-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [network, setNetworkState] = useState<AlgorandNetwork>(getInitialNetwork);

  const walletManager = useMemo(() => makeWalletManager(network), []);

  const setNetwork = useCallback((n: AlgorandNetwork) => {
    localStorage.setItem("algorand-network", n);
    setNetworkState(n);
    // important! if multiple networks are supported, the wallet manager needs to be informed of network changes so it can update its internal state and reinitialize connections as needed
    walletManager.setActiveNetwork(n)
  }, []);

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.color = theme === "dark" ? "rgba(255, 255, 255, 0.87)" : "#213547";
    document.documentElement.style.backgroundColor = theme === "dark" ? "#242424" : "#ffffff";
  }, [theme]);

  return (
    <WalletProvider manager={walletManager}>
      <WalletUIProvider theme={theme} wagmiConfig={wagmiConfig}>
        <App theme={theme} setTheme={setTheme} network={network} setNetwork={setNetwork} />
      </WalletUIProvider>
    </WalletProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);

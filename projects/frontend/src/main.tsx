import { Buffer } from "buffer";
(globalThis as unknown as Record<string, unknown>).Buffer = Buffer;

// TODO figure this out
// Stub TronWeb globals required by Allbridge SDK's bundled tronweb dependency
if (!(globalThis as any).TronWebProto) {
  (globalThis as any).TronWebProto = { Transaction: {} };
}

import { StrictMode, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { LogLevel, WalletProvider } from "@txnlab/use-wallet-react";
import { WalletUIProvider, type Theme } from "@txnlab/use-wallet-ui-react";
import "@txnlab/use-wallet-ui-react/dist/style.css";
import { WalletManager, WalletId } from "@txnlab/use-wallet-react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, useConnectModal } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useAccountEffect } from "wagmi";
import { getAccount, watchAccount } from "@wagmi/core";
import "./index.css";
import App from "./App.tsx";

type AlgorandNetwork = "localnet" | "testnet" | "mainnet";

// RPC URLs per Algorand network
const RPC_URLS: Record<AlgorandNetwork, string> = {
  localnet: "http://localhost:4001",
  testnet: "https://testnet-api.4160.nodely.dev",
  mainnet: "https://mainnet-api.4160.nodely.dev",
};

function makeAlgorandChain(network: AlgorandNetwork) {
  return {
    id: 4160,
    name: `Algorand (Liquid Accounts)`,
    nativeCurrency: {
      name: "ALGO",
      symbol: "ALGO",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [RPC_URLS[network]],
      },
    },
    blockExplorers: {
      default: {
        name: "Allo",
        url: network === "mainnet" ? "https://allo.info" : `https://${network === "testnet" ? "testnet." : ""}allo.info`,
      },
    },
  } as const;
}

function makeWagmiConfig(network: AlgorandNetwork) {
  return getDefaultConfig({
    appName: "Liquid EVM Accounts",
    projectId: "fcfde0713d43baa0d23be0773c80a72b",
    chains: [makeAlgorandChain(network)],
  });
}

// Module-level ref for opening the RainbowKit connect modal.
// Populated by RainbowKitModalBridge inside the provider tree.
let openRainbowKitModal: (() => void) | null = null;

function makeWalletManager(network: AlgorandNetwork, wagmiConfig: ReturnType<typeof makeWagmiConfig>) {
  return new WalletManager({
    options: {
      debug: true,
      logLevel: LogLevel.DEBUG,
      resetNetwork: true,
    },
    wallets: [
      {
        id: WalletId.RAINBOWKIT,
        options: {
          wagmiConfig,
          getEvmAccounts: () =>
            new Promise<string[]>((resolve, reject) => {
              if (!openRainbowKitModal) {
                reject(new Error("RainbowKit modal not ready"));
                return;
              }

              // Open the RainbowKit connect modal
              openRainbowKitModal();

              // Watch wagmi state for a connection event
              const unwatch = watchAccount(wagmiConfig, {
                onChange(account) {
                  if (account.isConnected && account.address) {
                    unwatch();
                    resolve(account.addresses ? [...account.addresses] : [account.address]);
                  }
                },
              });

              // Timeout after 2 minutes
              setTimeout(() => {
                unwatch();
                reject(new Error("Wallet connection timed out"));
              }, 120_000);
            }),
        },
      },
      WalletId.LUTE,
      ...(network === "localnet" ? [WalletId.KMD] : []),
    ],
    defaultNetwork: network,
  });
}

const queryClient = new QueryClient();

function getInitialNetwork(): AlgorandNetwork {
  const stored = localStorage.getItem("algorand-network");
  if (stored === "localnet" || stored === "testnet" || stored === "mainnet") return stored;
  return "localnet";
}

/**
 * Captures RainbowKit's openConnectModal into the module-level ref
 * so the WalletManager's getEvmAccounts callback can trigger it.
 */
function RainbowKitModalBridge() {
  const { openConnectModal } = useConnectModal();
  useEffect(() => {
    openRainbowKitModal = openConnectModal ?? null;
    return () => {
      openRainbowKitModal = null;
    };
  }, [openConnectModal]);
  return null;
}

/**
 * Bridge component that auto-connects the use-wallet RainbowKit wallet
 * when an EVM wallet connects via RainbowKit/wagmi.
 */
function EvmWalletBridge({ walletManager }: { walletManager: WalletManager }) {
  const account = useAccount();
  const connectingRef = useRef(false);

  useAccountEffect({
    onConnect({ address }) {
      if (connectingRef.current) return;
      const rkWallet = walletManager.wallets.find((w) => w.id === WalletId.RAINBOWKIT);
      if (rkWallet && !rkWallet.isConnected && address) {
        connectingRef.current = true;
        rkWallet.connect().catch((err) => {
          console.warn("[EvmWalletBridge] auto-connect failed:", err.message);
        }).finally(() => { connectingRef.current = false; });
      }
    },
    onDisconnect() {
      const rkWallet = walletManager.wallets.find((w) => w.id === WalletId.RAINBOWKIT);
      if (rkWallet && rkWallet.isConnected) {
        rkWallet.disconnect().catch((err) => {
          console.warn("[EvmWalletBridge] auto-disconnect failed:", err.message);
        });
      }
    },
  });

  useEffect(() => {
    if (account.isConnected && account.address) {
      const rkWallet = walletManager.wallets.find((w) => w.id === WalletId.RAINBOWKIT);
      if (rkWallet && !connectingRef.current) {
        if (!rkWallet.isConnected) {
          // Wallet not connected in store — do a full connect
          connectingRef.current = true;
          rkWallet.connect().catch((err) => {
            console.warn("[EvmWalletBridge] mount auto-connect failed:", err.message);
          }).finally(() => { connectingRef.current = false; });
        } else {
          // Wallet connected in store but instance may need session resumed
          // (e.g., after WalletManager recreation on network switch)
          rkWallet.resumeSession().catch(() => {});
        }
      }
    }
  }, [account.isConnected, account.address, walletManager]);

  return null;
}

function Root() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("app-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [network, setNetworkState] = useState<AlgorandNetwork>(getInitialNetwork);

  // Recreate wagmi config and wallet manager when network changes
  const wagmiConfig = useMemo(() => makeWagmiConfig(network), [network]);
  const walletManager = useMemo(() => makeWalletManager(network, wagmiConfig), [network, wagmiConfig]);

  const setNetwork = useCallback((n: AlgorandNetwork) => {
    localStorage.setItem("algorand-network", n);
    setNetworkState(n);
  }, []);

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.color = theme === "dark" ? "rgba(255, 255, 255, 0.87)" : "#213547";
    document.documentElement.style.backgroundColor = theme === "dark" ? "#242424" : "#ffffff";
  }, [theme]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <RainbowKitModalBridge />
          <EvmWalletBridge walletManager={walletManager} />
          <WalletProvider manager={walletManager}>
            <WalletUIProvider theme={theme}>
              <App theme={theme} setTheme={setTheme} network={network} setNetwork={setNetwork} />
            </WalletUIProvider>
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

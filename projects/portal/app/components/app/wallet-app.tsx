import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useWallet } from "@txnlab/use-wallet-react";
import { WalletButton } from "@txnlab/use-wallet-ui-react";
import { WalletProviders, wagmiConfig } from "./wallet-providers";
import { WalletDashboard } from "./wallet-dashboard";
import { UseAlgorandWith } from "~/components/use-algorand-with";
import { Button } from "../ui/button";

/**
 * Listens to wallet state and calls `onResolved` once we know the final
 * connection status (connected or definitively disconnected).
 * Renders nothing — lives inside WalletProviders only to access the hook.
 */
function WalletResolver({ onResolved }: { onResolved: () => void }) {
  const { activeAddress, isReady } = useWallet();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (activeAddress) {
      firedRef.current = true;
      onResolved();
      return;
    }
    if (!isReady) return;

    // Manager is ready but no wallet connected.
    // Subscribe to wagmi status — resolve once it settles to disconnected
    // (no session to restore) or connected (Bridge will sync it).
    const check = () => {
      const { status, connections } = wagmiConfig.state;
      if (status === "disconnected" && connections.size === 0) {
        firedRef.current = true;
        onResolved();
        return true;
      }
      return false;
    };
    // Already settled?
    if (check()) return;
    // Otherwise wait for wagmi to settle
    return wagmiConfig.subscribe(
      (state) => `${state.status}:${state.connections.size}`,
      () => check(),
    );
  }, [activeAddress, isReady, onResolved]);

  return null;
}

function WalletAppContent() {
  const { activeAddress } = useWallet();

  return (
    <>
      {!activeAddress && (
        <div className="flex flex-col items-center gap-6 text-center">
          <UseAlgorandWith className="mb-2 text-center" />
          <p className="mx-auto mb-2 max-w-2xl text-lg text-muted-foreground">
            No new wallet needed, no setup. Just connect any EVM wallet to send transactions, manage assets, swap and bridge on Algorand.
          </p>
          <div data-wallet-ui className="flex flex-col gap-2 justify-center mb-8">
            <WalletButton size="lg" className="rounded-md" />
            <Button variant="outline" size="lg" asChild>
              <Link to="/docs">Read the Docs</Link>
            </Button>
          </div>
        </div>
      )}
      <WalletDashboard />
    </>
  );
}

export default function WalletApp() {
  const [resolved, setResolved] = useState(false);
  const onResolved = useCallback(() => setResolved(true), []);

  const content = useMemo(() => {
    if (!resolved) {
      return (
        <>
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
          <WalletResolver onResolved={onResolved} />
        </>
      );
    }
    return <WalletAppContent />;
  }, [resolved, onResolved]);

  return <WalletProviders>{content}</WalletProviders>;
}

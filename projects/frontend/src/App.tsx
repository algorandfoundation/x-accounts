import { useState, useMemo } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { WalletButton } from "@txnlab/use-wallet-ui-react";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import "./App.css";
import base32 from "hi-base32";
import type { Theme } from "@txnlab/use-wallet-ui-react";

type AlgorandNetwork = "localnet" | "testnet" | "mainnet";

function getAlgorandClient(network: AlgorandNetwork): AlgorandClient {
  switch (network) {
    case "localnet":
      return AlgorandClient.defaultLocalNet();
    case "testnet":
      return AlgorandClient.fromConfig({
        algodConfig: {
          server: "https://testnet-api.4160.nodely.dev",
          token: "",
        },
      });
    case "mainnet":
      return AlgorandClient.fromConfig({
        algodConfig: {
          server: "https://mainnet-api.4160.nodely.dev",
          token: "",
        },
      });
  }
}

function bytesToBase32(bytes: Uint8Array): string {
  return base32.encode(bytes).replace(/=+$/, ""); // Remove padding
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

type PayloadInfo = { bytes: Uint8Array; type: "Group ID" | "Txn ID" };

type SendState =
  | { status: "idle" }
  | { status: "signing"; payload: PayloadInfo }
  | { status: "success"; txId: string; payload: PayloadInfo }
  | { status: "error"; message: string; payload: PayloadInfo };

function PayloadDisplay({ payload }: { payload: PayloadInfo }) {
  return (
    <div className="card">
      <p>Signing payload ({payload.type}):</p>
      <p>
        Base32: <code>{bytesToBase32(payload.bytes)}</code>
      </p>
      <p>
        Base64: <code>{btoa(String.fromCharCode(...payload.bytes))}</code>
      </p>
      <p>
        Hex: <code>{bytesToHex(payload.bytes)}</code>
      </p>
    </div>
  );
}

function AlgorandActions({ network }: { network: AlgorandNetwork }) {
  const { activeAccount, signTransactions } = useWallet();
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });
  const [lastPayload, setLastPayload] = useState<PayloadInfo | undefined>();
  const [assetId, setAssetId] = useState("");

  const algorand = useMemo(() => {
    const client = getAlgorandClient(network);
    client.setDefaultValidityWindow(1000);
    return client;
  }, [network]);

  const explorerBaseUrl = useMemo(() => {
    switch (network) {
      case "localnet":
        return "https://l.algo.surf";
      case "testnet":
        return "https://testnet.algo.surf";
      case "mainnet":
        return "https://algo.surf";
    }
  }, [network]);

  const optInToAsset = async () => {
    if (!activeAccount) return;
    const id = parseInt(assetId, 10);
    if (isNaN(id) || id <= 0) return;

    try {
      setSendState({ status: "idle" });
      setLastPayload(undefined);

      const txn = await algorand.createTransaction.assetOptIn({
        sender: activeAccount.address,
        assetId: BigInt(id),
      });

      const payload: PayloadInfo = { bytes: txn.rawTxID(), type: "Txn ID" };
      setLastPayload(payload);
      setSendState({ status: "signing", payload });

      const signedTxns = await signTransactions([txn.toByte()]);
      await algorand.client.algod.sendRawTransaction(signedTxns[0]!).do();

      setSendState({ status: "success", txId: txn.txID(), payload });
    } catch (e) {
      const payload = lastPayload ?? { bytes: new Uint8Array(), type: "Txn ID" as const };
      setSendState({ status: "error", message: (e as Error).message, payload });
    }
  };

  const send = async (numTxns: number, rekey = false) => {
    if (!activeAccount) return;

    try {
      setSendState({ status: "idle" });
      setLastPayload(undefined);

      if (numTxns === 1 && !rekey) {
        const txn = await algorand.createTransaction.payment({
          sender: activeAccount.address,
          receiver: activeAccount.address,
          amount: (0).algos(),
          ...(rekey ? { rekeyTo: activeAccount.address } : {}),
          note: crypto.getRandomValues(new Uint8Array(4)),
        });

        const payload: PayloadInfo = { bytes: txn.rawTxID(), type: "Txn ID" };
        setLastPayload(payload);
        setSendState({ status: "signing", payload });

        const signedTxns = await signTransactions([txn.toByte()]);
        await algorand.client.algod.sendRawTransaction(signedTxns[0]!).do();

        setSendState({ status: "success", txId: txn.txID(), payload });
      } else {
        const txns: algosdk.Transaction[] = [];
        for (let i = 0; i < numTxns; i++) {
          txns.push(
            await algorand.createTransaction.payment({
              sender: activeAccount.address,
              receiver: activeAccount.address,
              amount: (0).algos(),
              ...(rekey ? { rekeyTo: activeAccount.address } : {}),
              note: crypto.getRandomValues(new Uint8Array(4)),
            }),
          );
        }
        const groupedTxns = algosdk.assignGroupID(txns);

        const payload: PayloadInfo = { bytes: groupedTxns[0].group!, type: "Group ID" };
        setLastPayload(payload);
        setSendState({ status: "signing", payload });

        const signedTxns = await signTransactions(groupedTxns.map((t) => t.toByte()));
        await algorand.client.algod.sendRawTransaction(signedTxns.map((t: Uint8Array | null) => t!)).do();

        setSendState({ status: "success", txId: groupedTxns[0].txID(), payload });
      }
    } catch (e) {
      const payload = lastPayload ?? { bytes: new Uint8Array(), type: "Txn ID" as const };
      setSendState({ status: "error", message: (e as Error).message, payload });
    }
  };

  if (!activeAccount) return null;

  return (
    <div>
      <div className="card">
        {activeAccount?.name && (
          <>
            <p>Connected with:</p>
            <code>{activeAccount.name}</code>
          </>
        )}
        <p>Algorand address:</p>
        <a href={`${explorerBaseUrl}/${activeAccount.address}`} target="_blank" rel="noopener noreferrer">
          <code>{activeAccount.address}</code>
        </a>
      </div>
      <div className="card">
        <button onClick={() => send(1)} disabled={sendState.status === "signing"}>
          Send 1x
        </button>{" "}
        <button onClick={() => send(2)} disabled={sendState.status === "signing"}>
          Send 2x
        </button>{" "}
        <button onClick={() => send(1, true)} disabled={sendState.status === "signing"}>
          Send Rekey
        </button>{" "}
      </div>
      <div className="card">
        <input type="text" placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} style={{ marginRight: 8 }} />
        <button onClick={optInToAsset} disabled={sendState.status === "signing" || !assetId}>
          Opt In ASA
        </button>
      </div>
      {sendState.status !== "idle" && lastPayload && <PayloadDisplay payload={lastPayload} />}
      {sendState.status === "signing" && (
        <div className="card">
          <p>Waiting for wallet approval...</p>
        </div>
      )}
      {sendState.status === "success" && (
        <div className="card">
          <p>
            Success:{" "}
            <a href={`${explorerBaseUrl}/${sendState.txId}`} target="_blank" rel="noopener noreferrer">
              {sendState.txId}
            </a>
          </p>
        </div>
      )}
      {sendState.status === "error" && (
        <div className="card">
          <p>Error: {sendState.message}</p>
        </div>
      )}
    </div>
  );
}

const NETWORK_LABELS: Record<AlgorandNetwork, string> = {
  localnet: "LocalNet",
  testnet: "TestNet",
  mainnet: "MainNet",
};

const NETWORK_COLORS: Record<AlgorandNetwork, string> = {
  localnet: "#f59e0b",
  testnet: "#3b82f6",
  mainnet: "#10b981",
};

function NetworkSelector({ network, setNetwork }: { network: AlgorandNetwork; setNetwork: (n: AlgorandNetwork) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "light-dark(#e5e5e5, #3a3a3a)", borderRadius: 8, padding: 3 }}>
      {(["localnet", "testnet", "mainnet"] as const).map((n) => (
        <button
          key={n}
          onClick={() => setNetwork(n)}
          style={{
            padding: "4px 10px",
            fontSize: 13,
            fontWeight: network === n ? 600 : 400,
            borderRadius: 6,
            border: "none",
            background: network === n ? "light-dark(#fff, #555)" : "transparent",
            color: network === n ? NETWORK_COLORS[n] : "inherit",
            boxShadow: network === n ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {NETWORK_LABELS[n]}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        padding: 0,
        borderRadius: "50%",
        background: "transparent",
        border: "1px solid #666",
        cursor: "pointer",
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      {theme === "light" ? "\u{263D}" : "\u{2600}"}
    </button>
  );
}

interface AppProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  network: AlgorandNetwork;
  setNetwork: (n: AlgorandNetwork) => void;
}

export default function App({ theme, setTheme, network, setNetwork }: AppProps) {
  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-end", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <NetworkSelector network={network} setNetwork={setNetwork} />
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <WalletButton />
      </div>
      <h1>Liquid EVM Accounts</h1>
      <p style={{ opacity: 0.6, marginTop: -8 }}>
        Network: <strong style={{ color: NETWORK_COLORS[network] }}>{NETWORK_LABELS[network]}</strong>
      </p>
      <AlgorandActions network={network} />
    </div>
  );
}

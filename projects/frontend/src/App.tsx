import { useState } from "react";
import { useWallet } from "./use-wallet-react.tsx";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import "./App.css";
import base32 from "hi-base32";

const algorand = AlgorandClient.defaultLocalNet();
algorand.setDefaultValidityWindow(1000);

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

function WalletConnect() {
  const { wallets, activeWallet, activeAccount } = useWallet();

  if (activeAccount) {
    return (
      <div className="connect-wrapper">
        <div className="card">
          <p>
            Connected: <code>{activeAccount.name}</code>{" "}
            {activeWallet?.metadata?.icon && (
              <img
                src={activeWallet.metadata.icon}
                alt={activeWallet.metadata.name}
                style={{ width: 20, height: 20, verticalAlign: "middle", marginLeft: 4 }}
              />
            )}
          </p>
          <button onClick={() => activeWallet?.disconnect()}>Disconnect</button>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-wrapper">
      <div className="card">
        <p>Select a wallet:</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {wallets.map((wallet) => (
            <button key={wallet.id} onClick={() => wallet.connect()} disabled={wallet.isConnected}>
              {wallet.metadata.icon && (
                <img
                  src={wallet.metadata.icon}
                  alt={wallet.metadata.name}
                  style={{ width: 64, height: 64, verticalAlign: "middle", marginLeft: 4 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlgorandActions() {
  const { activeAccount, signTransactions } = useWallet();
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });
  const [lastPayload, setLastPayload] = useState<PayloadInfo | undefined>();

  const [assetId, setAssetId] = useState("");

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

      const signedTxns = await signTransactions([txn]);
      await algorand.client.algod.sendRawTransaction(signedTxns[0]!).do();

      setSendState({ status: "success", txId: txn.txID(), payload });
    } catch (e) {
      const payload = lastPayload ?? { bytes: new Uint8Array(), type: "Txn ID" as const };
      setSendState({ status: "error", message: (e as Error).message, payload });
    }
  };

  const send = async (numTxns: number, forceGroup = false) => {
    if (!activeAccount) return;

    try {
      setSendState({ status: "idle" });
      setLastPayload(undefined);

      if (numTxns === 1 && !forceGroup) {
        // Standalone transaction
        const txn = await algorand.createTransaction.payment({
          sender: activeAccount.address,
          receiver: activeAccount.address,
          amount: (0).algos(),
          note: crypto.getRandomValues(new Uint8Array(4)),
        });

        const payload: PayloadInfo = { bytes: txn.rawTxID(), type: "Txn ID" };
        setLastPayload(payload);
        setSendState({ status: "signing", payload });

        const signedTxns = await signTransactions([txn]);
        await algorand.client.algod.sendRawTransaction(signedTxns[0]!).do();

        setSendState({ status: "success", txId: txn.txID(), payload });
      } else if (numTxns === 1 && forceGroup) {
        // Single txn forced into a group
        const txn = await algorand.createTransaction.payment({
          sender: activeAccount.address,
          receiver: activeAccount.address,
          amount: (0).algos(),
          note: crypto.getRandomValues(new Uint8Array(4)),
        });
        const [gtxn] = algosdk.assignGroupID([txn]);

        // For single transaction group, the payload is the txn ID, not group ID
        const payload: PayloadInfo = {
          bytes: gtxn.rawTxID(),
          type: "Txn ID",
        };
        setLastPayload(payload);
        setSendState({ status: "signing", payload });

        const signedTxns = await signTransactions([gtxn]);
        await algorand.client.algod.sendRawTransaction(signedTxns[0]!).do();

        setSendState({ status: "success", txId: gtxn.txID(), payload });
      } else {
        // Multiple txns
        const txns: algosdk.Transaction[] = [];
        for (let i = 0; i < numTxns; i++) {
          txns.push(
            await algorand.createTransaction.payment({
              sender: activeAccount.address,
              receiver: activeAccount.address,
              amount: (0).algos(),
              note: crypto.getRandomValues(new Uint8Array(4)),
            }),
          );
        }
        const groupedTxns = algosdk.assignGroupID(txns);

        const payload: PayloadInfo = { bytes: groupedTxns[0].group!, type: "Group ID" };
        setLastPayload(payload);
        setSendState({ status: "signing", payload });

        const signedTxns = await signTransactions(groupedTxns);
        await algorand.client.algod.sendRawTransaction(signedTxns.map((t) => t!)).do();

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
        <p>Algorand address:</p>
        <a href={`https://l.algo.surf/${activeAccount.address}`} target="_blank" rel="noopener noreferrer">
          <code>{activeAccount.address}</code>
        </a>
      </div>
      <div className="card">
        <button onClick={() => send(1)} disabled={sendState.status === "signing"}>
          Send 1x
        </button>{" "}
        <button onClick={() => send(1, true)} disabled={sendState.status === "signing"}>
          Send 1x (grouped)
        </button>{" "}
        <button onClick={() => send(2)} disabled={sendState.status === "signing"}>
          Send 2x
        </button>
      </div>
      <div className="card">
        <input
          type="text"
          placeholder="Asset ID"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={optInToAsset} disabled={sendState.status === "signing" || !assetId}>
          Opt In ASA
        </button>
      </div>
      {sendState.status !== "idle" && lastPayload && <PayloadDisplay payload={lastPayload} />}
      {sendState.status === "signing" && (
        <div className="card">
          <p>Waiting for wallet approval…</p>
        </div>
      )}
      {sendState.status === "success" && (
        <div className="card">
          <p>
            Success:{" "}
            <a href={`https://l.algo.surf/${sendState.txId}`} target="_blank" rel="noopener noreferrer">
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

function App() {
  return (
    <>
      <h1>Liquid EVM</h1>
      <WalletConnect />
      <AlgorandActions />
    </>
  );
}

export default App;

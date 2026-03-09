import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";

interface PendingTxn {
  id: string;
  signedTxnBytes: string[]; // base64-encoded signed bytes (full atomic group)
  senders: string[]; // unique sender addresses across all txns in group
  lastValid: number; // minimum lastValid across group (Algorand rounds fit in JS safe integer)
  addedAt: number; // Date.now()
}

type SimulateOutcome =
  | { type: "success" }
  | { type: "insufficient_balance"; message: string }
  | { type: "other_failure"; message: string };

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class DfxManager implements DurableObject {
  private state: DurableObjectState;
  private algorand: AlgorandClient;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
    this.algorand = AlgorandClient.mainNet();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/submit" && request.method === "POST") {
      return this.handleSubmit(request);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return this.handleHealth();
    }

    return json({ error: "Not Found" }, 404);
  }

  async alarm(): Promise<void> {
    try {
      await this.runPoll();
    } catch (e) {
      console.error("DfxManager alarm error:", e);
    }
    await this.scheduleAlarmIfNeeded();
  }

  private async handleSubmit(request: Request): Promise<Response> {
    let body: { signedTxns?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ status: "invalid", error: "Invalid JSON body" }, 400);
    }

    const { signedTxns } = body;
    if (!Array.isArray(signedTxns) || signedTxns.length === 0) {
      return json(
        { status: "invalid", error: "signedTxns must be a non-empty array" },
        400
      );
    }

    // Decode bytes from base64
    let signedBytesArray: Uint8Array[];
    try {
      signedBytesArray = (signedTxns as string[]).map(b64ToBytes);
    } catch {
      return json(
        { status: "invalid", error: "signedTxns must be base64-encoded strings" },
        400
      );
    }

    // Decode transactions to extract metadata
    let decoded: algosdk.SignedTransaction[];
    try {
      decoded = signedBytesArray.map((b) => algosdk.decodeSignedTransaction(b));
    } catch (e) {
      return json(
        { status: "invalid", error: `Failed to decode transactions: ${e}` },
        400
      );
    }

    // Simulate to check current validity
    const simResult = await this.simulateTxns(signedTxns as string[]);

    if (simResult.type === "success") {
      return json({ status: "submitted" });
    }

    if (simResult.type === "other_failure") {
      return json({ status: "invalid", error: simResult.message }, 400);
    }

    // insufficient_balance — store for deferred execution
    const txId = decoded[0].txn.txID();
    const senders = [
      ...new Set(decoded.map((st) => st.txn.sender.toString())),
    ];
    const lastValid = Number(
      decoded.reduce(
        (min, st) => (st.txn.lastValid < min ? st.txn.lastValid : min),
        decoded[0].txn.lastValid
      )
    );

    const pending: PendingTxn = {
      id: txId,
      signedTxnBytes: signedTxns as string[],
      senders,
      lastValid,
      addedAt: Date.now(),
    };

    await this.storePending(pending);
    await this.scheduleAlarmIfNeeded();

    console.log(
      `DfxManager: deferred txn ${txId} (senders: ${senders.join(", ")}, lastValid: ${lastValid})`
    );

    return json({ status: "deferred", txId });
  }

  private async handleHealth(): Promise<Response> {
    const count =
      (await this.state.storage.get<number>("pendingCount")) ?? 0;
    let lastRound = 0;
    try {
      const status = await this.algorand.client.algod.status().do();
      lastRound = Number(status.lastRound);
    } catch {
      // ignore
    }
    return json({ pending: count, lastRound });
  }

  private async simulateTxns(signedTxnBase64s: string[]): Promise<SimulateOutcome> {
    try {
      const signedBytesArray = signedTxnBase64s.map(b64ToBytes);
      const txnsForRequest = signedBytesArray.map((b) =>
        algosdk.decodeMsgpack(b, algosdk.SignedTransaction)
      );

      const request = new algosdk.modelsv2.SimulateRequest({
        txnGroups: [
          new algosdk.modelsv2.SimulateRequestTransactionGroup({
            txns: txnsForRequest,
          }),
        ],
        allowEmptySignatures: false,
      });

      const result = await this.algorand.client.algod
        .simulateTransactions(request)
        .do();

      for (const group of result.txnGroups) {
        if (group.failedAt !== undefined) {
          const msg = group.failureMessage ?? "simulation failed";
          if (/overspend|balance|below min|insufficient/i.test(msg)) {
            return { type: "insufficient_balance", message: msg };
          }
          return { type: "other_failure", message: msg };
        }
      }

      return { type: "success" };
    } catch (e) {
      return { type: "other_failure", message: String(e) };
    }
  }

  private async runPoll(): Promise<void> {
    const map = await this.state.storage.list<string>({ prefix: "pending:" });
    if (map.size === 0) return;

    const allPending: PendingTxn[] = [];
    for (const val of map.values()) {
      allPending.push(JSON.parse(val) as PendingTxn);
    }

    // Get current round for expiry checks
    let currentRound: number;
    try {
      const status = await this.algorand.client.algod.status().do();
      currentRound = Number(status.lastRound);
    } catch (e) {
      console.error("DfxManager: failed to get status:", e);
      return;
    }

    // Expire stale transactions
    const expired = allPending.filter((t) => t.lastValid < currentRound);
    for (const t of expired) {
      console.log(
        `DfxManager: expiring txn ${t.id} (lastValid ${t.lastValid} < currentRound ${currentRound})`
      );
      await this.removePending(t.id);
    }

    const stillPending = allPending.filter((t) => t.lastValid >= currentRound);

    // Re-simulate all remaining; submit those that are now valid
    for (const pending of stillPending) {
      const simResult = await this.simulateTxns(pending.signedTxnBytes);

      if (simResult.type === "success") {
        await this.trySubmit(pending);
      } else if (simResult.type === "other_failure") {
        console.warn(
          `DfxManager: removing txn ${pending.id} — non-balance failure: ${simResult.message}`
        );
        await this.removePending(pending.id);
      }
      // insufficient_balance: leave for next tick
    }
  }

  private async trySubmit(pending: PendingTxn): Promise<void> {
    try {
      const signedBytesArray = pending.signedTxnBytes.map(b64ToBytes);

      // Concatenate all signed bytes — algod requires this for atomic groups
      const totalLen = signedBytesArray.reduce((n, b) => n + b.length, 0);
      const all = new Uint8Array(totalLen);
      let offset = 0;
      for (const b of signedBytesArray) {
        all.set(b, offset);
        offset += b.length;
      }

      await this.algorand.client.algod.sendRawTransaction(all).do();
      console.log(`DfxManager: submitted txn group ${pending.id}`);
      await this.removePending(pending.id);
    } catch (e) {
      console.error(`DfxManager: failed to submit ${pending.id}:`, e);
    }
  }

  private async storePending(txn: PendingTxn): Promise<void> {
    await this.state.storage.put(`pending:${txn.id}`, JSON.stringify(txn));
    const count =
      (await this.state.storage.get<number>("pendingCount") ?? 0) + 1;
    await this.state.storage.put("pendingCount", count);
  }

  private async removePending(txId: string): Promise<void> {
    await this.state.storage.delete(`pending:${txId}`);
    const count = Math.max(
      0,
      (await this.state.storage.get<number>("pendingCount") ?? 1) - 1
    );
    await this.state.storage.put("pendingCount", count);
  }

  private async scheduleAlarmIfNeeded(): Promise<void> {
    const count =
      (await this.state.storage.get<number>("pendingCount")) ?? 0;
    if (count > 0 && (await this.state.storage.getAlarm()) === null) {
      await this.state.storage.setAlarm(Date.now() + 4_000);
    }
  }
}

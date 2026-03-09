import { describe, it, expect, beforeEach, vi } from "vitest";
import algosdk from "algosdk";
import { DfxManager } from "../src/DfxManager";

// ---------------------------------------------------------------------------
// Hoisted mock controls — must be defined before vi.mock() factory runs
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  lastRound: { value: 1000n as bigint },
  simulateResult: {
    value: {
      txnGroups: [
        {
          failedAt: undefined as number[] | undefined,
          failureMessage: undefined as string | undefined,
        },
      ],
    },
  },
  sendRawTxn: vi.fn().mockResolvedValue({}),
  statusThrows: { value: false },
  simulateThrows: { value: false },
}));

vi.mock("@algorandfoundation/algokit-utils", () => ({
  AlgorandClient: {
    mainNet: () => ({
      client: {
        algod: {
          status: () => ({
            do: async () => {
              if (mocks.statusThrows.value) throw new Error("algod down");
              return { lastRound: mocks.lastRound.value };
            },
          }),
          simulateTransactions: (_req: unknown) => ({
            do: async () => {
              if (mocks.simulateThrows.value)
                throw new Error("simulate error");
              return mocks.simulateResult.value;
            },
          }),
          sendRawTransaction: (bytes: Uint8Array) => ({
            do: () => mocks.sendRawTxn(bytes),
          }),
        },
      },
    }),
  },
}));

// ---------------------------------------------------------------------------
// FakeStorage — in-memory DurableObject storage
// ---------------------------------------------------------------------------
class FakeStorage {
  data = new Map<string, unknown>();
  private alarmTime: number | null = null;

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }
  async put(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }
  async list<T>(opts: { prefix?: string }): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    for (const [k, v] of this.data) {
      if (!opts.prefix || k.startsWith(opts.prefix))
        result.set(k, v as T);
    }
    return result;
  }
  async getAlarm(): Promise<number | null> {
    return this.alarmTime;
  }
  async setAlarm(time: number): Promise<void> {
    this.alarmTime = time;
  }
  async deleteAlarm(): Promise<void> {
    this.alarmTime = null;
  }
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------
const acct1 = algosdk.generateAccount();
const acct2 = algosdk.generateAccount();

function makeSuggestedParams(
  firstValid = 1000n,
  lastValid = 2000n
): algosdk.SuggestedParams {
  return {
    flatFee: true,
    fee: 1000n,
    firstValid,
    lastValid,
    genesisHash: new Uint8Array(32).fill(1),
    genesisID: "test",
    minFee: 1000n,
  };
}

function makeSignedPayTxn(opts: {
  acct?: typeof acct1;
  firstValid?: bigint;
  lastValid?: bigint;
} = {}): Uint8Array {
  const acct = opts.acct ?? acct1;
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: acct.addr.toString(),
    receiver: acct.addr.toString(),
    amount: 0,
    suggestedParams: makeSuggestedParams(opts.firstValid, opts.lastValid),
  });
  return txn.signTxn(acct.sk);
}

function makeSignedGroup(opts: {
  acct1?: typeof acct1;
  acct2?: typeof acct1;
  lastValid1?: bigint;
  lastValid2?: bigint;
} = {}): [Uint8Array, Uint8Array] {
  const a1 = opts.acct1 ?? acct1;
  const a2 = opts.acct2 ?? acct2;
  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: a1.addr.toString(),
    receiver: a1.addr.toString(),
    amount: 0,
    suggestedParams: makeSuggestedParams(1000n, opts.lastValid1 ?? 2000n),
  });
  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: a2.addr.toString(),
    receiver: a2.addr.toString(),
    amount: 0,
    suggestedParams: makeSuggestedParams(1000n, opts.lastValid2 ?? 2000n),
  });
  algosdk.assignGroupID([txn1, txn2]);
  return [txn1.signTxn(a1.sk), txn2.signTxn(a2.sk)];
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function submitReq(signedTxns: string[]): Request {
  return new Request("http://localhost/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedTxns }),
  });
}

// ---------------------------------------------------------------------------
// Mock state helpers
// ---------------------------------------------------------------------------
function setSimulateSuccess(): void {
  mocks.simulateResult.value = {
    txnGroups: [{ failedAt: undefined, failureMessage: undefined }],
  };
  mocks.simulateThrows.value = false;
}

function setBalanceFailure(msg = "overspend"): void {
  mocks.simulateResult.value = {
    txnGroups: [{ failedAt: [0], failureMessage: msg }],
  };
  mocks.simulateThrows.value = false;
}

function setOtherFailure(msg = "program rejected"): void {
  mocks.simulateResult.value = {
    txnGroups: [{ failedAt: [0], failureMessage: msg }],
  };
  mocks.simulateThrows.value = false;
}

// Pre-populate storage with a pending txn (bypassing handleSubmit)
function seedPending(
  txnBytes: Uint8Array,
  lastValid?: number
): string {
  const decoded = algosdk.decodeSignedTransaction(txnBytes);
  const id = decoded.txn.txID();
  const lv = lastValid ?? Number(decoded.txn.lastValid);
  const pending = {
    id,
    signedTxnBytes: [toBase64(txnBytes)],
    senders: [decoded.txn.sender.toString()],
    lastValid: lv,
    addedAt: Date.now(),
  };
  storage.data.set(`pending:${id}`, JSON.stringify(pending));
  storage.data.set("pendingCount", 1);
  return id;
}

function seedPendingGroup(
  bytes: [Uint8Array, Uint8Array],
  lastValid?: number
): string {
  const decoded = algosdk.decodeSignedTransaction(bytes[0]);
  const id = decoded.txn.txID();
  const lv = lastValid ?? Number(decoded.txn.lastValid);
  const pending = {
    id,
    signedTxnBytes: [toBase64(bytes[0]), toBase64(bytes[1])],
    senders: [
      decoded.txn.sender.toString(),
      algosdk.decodeSignedTransaction(bytes[1]).txn.sender.toString(),
    ],
    lastValid: lv,
    addedAt: Date.now(),
  };
  storage.data.set(`pending:${id}`, JSON.stringify(pending));
  storage.data.set("pendingCount", 1);
  return id;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
let storage: FakeStorage;
let manager: DfxManager;

beforeEach(() => {
  storage = new FakeStorage();
  manager = new DfxManager(
    { storage } as unknown as DurableObjectState,
    {}
  );
  mocks.sendRawTxn.mockClear();
  mocks.sendRawTxn.mockResolvedValue({});
  setSimulateSuccess();
  mocks.lastRound.value = 1000n;
  mocks.statusThrows.value = false;
});

// ===========================================================================
// Group 1: Input Validation — POST /submit
// ===========================================================================
describe("Group 1: Input Validation", () => {
  it("1. invalid JSON body → 400, status invalid, error message", async () => {
    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{{{",
    });
    const res = await manager.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
    expect(body.error).toBe("Invalid JSON body");
  });

  it("2. missing signedTxns field → 400, status invalid", async () => {
    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });
    const res = await manager.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
  });

  it("3. empty signedTxns array → 400, status invalid", async () => {
    const res = await manager.fetch(submitReq([]));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
  });

  it("4. non-base64 string in array → 400, status invalid", async () => {
    const res = await manager.fetch(submitReq(["!!!not_base64!!!"]));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
  });

  it("5. valid base64 but bad msgpack → 400, error contains 'decode'", async () => {
    // Valid base64 of random bytes that are not valid msgpack signed txn
    const garbage = toBase64(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    const res = await manager.fetch(submitReq([garbage]));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
    expect(String(body.error)).toContain("decode");
  });
});

// ===========================================================================
// Group 2: Submit — Simulation Outcomes
// ===========================================================================
describe("Group 2: Simulation Outcomes", () => {
  it("6. simulate success → 200, status submitted, nothing stored, no alarm", async () => {
    const txBytes = makeSignedPayTxn();
    setSimulateSuccess();
    const res = await manager.fetch(submitReq([toBase64(txBytes)]));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("submitted");
    // Nothing stored in pending
    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(0);
    // No alarm set
    expect(await storage.getAlarm()).toBeNull();
  });

  it("7. simulate failedAt overspend → 200, status deferred, txId, pending stored, alarm set", async () => {
    const txBytes = makeSignedPayTxn();
    setBalanceFailure("overspend");
    const res = await manager.fetch(submitReq([toBase64(txBytes)]));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("deferred");
    expect(typeof body.txId).toBe("string");
    // Pending stored
    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(1);
    // Alarm set
    expect(await storage.getAlarm()).not.toBeNull();
  });

  it("8. simulate failedAt 'below min balance' → 200, status deferred", async () => {
    const txBytes = makeSignedPayTxn();
    setBalanceFailure("below min balance");
    const res = await manager.fetch(submitReq([toBase64(txBytes)]));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("deferred");
  });

  it("9. simulate failedAt 'program rejected' → 400, status invalid", async () => {
    const txBytes = makeSignedPayTxn();
    setOtherFailure("program rejected");
    const res = await manager.fetch(submitReq([toBase64(txBytes)]));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
    expect(String(body.error)).toContain("program rejected");
  });

  it("10. simulateTransactions throws → 400, status invalid", async () => {
    const txBytes = makeSignedPayTxn();
    mocks.simulateThrows.value = true;
    const res = await manager.fetch(submitReq([toBase64(txBytes)]));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("invalid");
  });
});

// ===========================================================================
// Group 3: Submit — Metadata Extraction
// ===========================================================================
describe("Group 3: Metadata Extraction", () => {
  async function getPendingFromStorage(): Promise<Record<string, unknown>> {
    const map = await storage.list<string>({ prefix: "pending:" });
    const [val] = map.values();
    return JSON.parse(val) as Record<string, unknown>;
  }

  it("11. single txn balance failure — senders contains sender, lastValid matches", async () => {
    const txBytes = makeSignedPayTxn({ lastValid: 3000n });
    setBalanceFailure();
    await manager.fetch(submitReq([toBase64(txBytes)]));
    const pending = await getPendingFromStorage();
    expect((pending.senders as string[])).toContain(acct1.addr.toString());
    expect(pending.lastValid).toBe(3000);
  });

  it("12. two-txn group same sender — senders deduplicated", async () => {
    const [b1, b2] = makeSignedGroup({ acct1, acct2: acct1 });
    setBalanceFailure();
    await manager.fetch(submitReq([toBase64(b1), toBase64(b2)]));
    const pending = await getPendingFromStorage();
    const senders = pending.senders as string[];
    expect(senders).toHaveLength(1);
    expect(senders[0]).toBe(acct1.addr.toString());
  });

  it("13. two-txn group different senders — both senders stored", async () => {
    const [b1, b2] = makeSignedGroup({ acct1, acct2 });
    setBalanceFailure();
    await manager.fetch(submitReq([toBase64(b1), toBase64(b2)]));
    const pending = await getPendingFromStorage();
    const senders = pending.senders as string[];
    expect(senders).toHaveLength(2);
    expect(senders).toContain(acct1.addr.toString());
    expect(senders).toContain(acct2.addr.toString());
  });

  it("14. two-txn group different lastValid — lastValid = min(lv1, lv2)", async () => {
    const [b1, b2] = makeSignedGroup({ lastValid1: 1500n, lastValid2: 3000n });
    setBalanceFailure();
    await manager.fetch(submitReq([toBase64(b1), toBase64(b2)]));
    const pending = await getPendingFromStorage();
    expect(pending.lastValid).toBe(1500);
  });
});

// ===========================================================================
// Group 4: Alarm — Expiry
// ===========================================================================
describe("Group 4: Alarm Expiry", () => {
  it("15. no pending txns — alarm returns immediately, no algod calls", async () => {
    await manager.alarm();
    expect(mocks.sendRawTxn).not.toHaveBeenCalled();
  });

  it("16. pending txn with lastValid < currentRound — removed, pendingCount 0", async () => {
    mocks.lastRound.value = 3000n;
    seedPending(makeSignedPayTxn(), 500); // lastValid 500 < round 3000
    await manager.alarm();
    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(0);
    expect(await storage.get<number>("pendingCount")).toBe(0);
    // No alarm rescheduled (no more pending)
    expect(await storage.getAlarm()).toBeNull();
  });

  it("17. multiple txns, one expired, one valid — expired removed, valid re-simulated", async () => {
    mocks.lastRound.value = 3000n;
    const expiredId = seedPending(makeSignedPayTxn({ lastValid: 500n }), 500);
    // Manually add second pending txn without overwriting pendingCount
    const validBytes = makeSignedPayTxn({ lastValid: 5000n });
    const validDecoded = algosdk.decodeSignedTransaction(validBytes);
    const validId = validDecoded.txn.txID();
    storage.data.set(
      `pending:${validId}`,
      JSON.stringify({
        id: validId,
        signedTxnBytes: [toBase64(validBytes)],
        senders: [validDecoded.txn.sender.toString()],
        lastValid: 5000,
        addedAt: Date.now(),
      })
    );
    storage.data.set("pendingCount", 2);

    // Valid txn simulation → balance failure (kept)
    setBalanceFailure();

    await manager.alarm();

    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.has(`pending:${expiredId}`)).toBe(false);
    expect(pending.has(`pending:${validId}`)).toBe(true);
  });
});

// ===========================================================================
// Group 5: Alarm — Re-simulate and Submit
// ===========================================================================
describe("Group 5: Alarm Re-simulate and Submit", () => {
  it("18. pending txn, simulate succeeds — sendRawTransaction called, txn removed", async () => {
    mocks.lastRound.value = 1000n;
    const txBytes = makeSignedPayTxn({ lastValid: 5000n });
    seedPending(txBytes, 5000);
    setSimulateSuccess();

    await manager.alarm();

    expect(mocks.sendRawTxn).toHaveBeenCalledOnce();
    // Verify the bytes passed are the concatenated signed txn bytes
    const calledWith = mocks.sendRawTxn.mock.calls[0][0] as Uint8Array;
    expect(calledWith).toBeInstanceOf(Uint8Array);
    expect(calledWith.length).toBe(txBytes.length);
    // Txn removed from storage
    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(0);
    expect(await storage.get<number>("pendingCount")).toBe(0);
  });

  it("19. pending txn, simulate still insufficient_balance — txn kept, alarm rescheduled", async () => {
    mocks.lastRound.value = 1000n;
    seedPending(makeSignedPayTxn({ lastValid: 5000n }), 5000);
    setBalanceFailure();

    await manager.alarm();

    expect(mocks.sendRawTxn).not.toHaveBeenCalled();
    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(1);
    expect(await storage.getAlarm()).not.toBeNull();
  });

  it("20. pending txn, simulate returns other_failure — txn removed", async () => {
    mocks.lastRound.value = 1000n;
    seedPending(makeSignedPayTxn({ lastValid: 5000n }), 5000);
    setOtherFailure("contract assertion failed");

    await manager.alarm();

    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(0);
    expect(await storage.get<number>("pendingCount")).toBe(0);
  });

  it("21. sendRawTransaction throws — txn kept, alarm rescheduled", async () => {
    mocks.lastRound.value = 1000n;
    seedPending(makeSignedPayTxn({ lastValid: 5000n }), 5000);
    setSimulateSuccess();
    mocks.sendRawTxn.mockRejectedValueOnce(new Error("network error"));

    await manager.alarm();

    // Txn not removed (submit failed)
    const pending = await storage.list({ prefix: "pending:" });
    expect(pending.size).toBe(1);
    // Alarm rescheduled
    expect(await storage.getAlarm()).not.toBeNull();
  });
});

// ===========================================================================
// Group 6: Alarm — Rescheduling
// ===========================================================================
describe("Group 6: Alarm Rescheduling", () => {
  it("22. pending remains after poll — setAlarm called ~Date.now() + 4000", async () => {
    mocks.lastRound.value = 1000n;
    seedPending(makeSignedPayTxn({ lastValid: 5000n }), 5000);
    setBalanceFailure();

    const before = Date.now();
    await manager.alarm();
    const after = Date.now();

    const alarmTime = await storage.getAlarm();
    expect(alarmTime).not.toBeNull();
    expect(alarmTime!).toBeGreaterThanOrEqual(before + 3900);
    expect(alarmTime!).toBeLessThanOrEqual(after + 4100);
  });

  it("23. all txns cleared after poll — alarm not set", async () => {
    mocks.lastRound.value = 1000n;
    seedPending(makeSignedPayTxn({ lastValid: 5000n }), 5000);
    setSimulateSuccess();

    await manager.alarm();

    expect(await storage.getAlarm()).toBeNull();
  });

  it("24. alarm already set when new txn deferred — alarm not overwritten", async () => {
    const existingAlarm = Date.now() + 2000;
    storage.alarmTime = existingAlarm;

    const txBytes = makeSignedPayTxn();
    setBalanceFailure();
    await manager.fetch(submitReq([toBase64(txBytes)]));

    // scheduleAlarmIfNeeded should not overwrite since alarm is already set
    expect(await storage.getAlarm()).toBe(existingAlarm);
  });
});

// ===========================================================================
// Group 7: Group Transaction Submission
// ===========================================================================
describe("Group 7: Group Transaction Submission", () => {
  it("25. 2-txn group submitted via alarm — sendRawTransaction receives concatenated bytes", async () => {
    mocks.lastRound.value = 1000n;
    const [b1, b2] = makeSignedGroup();
    seedPendingGroup([b1, b2], 5000);
    setSimulateSuccess();

    await manager.alarm();

    expect(mocks.sendRawTxn).toHaveBeenCalledOnce();
    const sentBytes = mocks.sendRawTxn.mock.calls[0][0] as Uint8Array;
    expect(sentBytes.length).toBe(b1.length + b2.length);
    // First chunk matches b1, second chunk matches b2
    expect(sentBytes.slice(0, b1.length)).toEqual(b1);
    expect(sentBytes.slice(b1.length)).toEqual(b2);
  });
});

// ===========================================================================
// Group 8: Health Endpoint
// ===========================================================================
describe("Group 8: Health Endpoint", () => {
  async function health(): Promise<Record<string, unknown>> {
    const res = await manager.fetch(
      new Request("http://localhost/health", { method: "GET" })
    );
    expect(res.status).toBe(200);
    return res.json() as Promise<Record<string, unknown>>;
  }

  it("26. 0 pending txns → { pending: 0, lastRound: 1000 }", async () => {
    mocks.lastRound.value = 1000n;
    const body = await health();
    expect(body.pending).toBe(0);
    expect(body.lastRound).toBe(1000);
  });

  it("27. 2 pending txns → { pending: 2, lastRound: 1000 }", async () => {
    storage.data.set("pendingCount", 2);
    mocks.lastRound.value = 1000n;
    const body = await health();
    expect(body.pending).toBe(2);
    expect(body.lastRound).toBe(1000);
  });

  it("28. algod status throws → { pending: 0, lastRound: 0 }", async () => {
    mocks.statusThrows.value = true;
    const body = await health();
    expect(body.pending).toBe(0);
    expect(body.lastRound).toBe(0);
  });
});

// ===========================================================================
// Group 9: CORS / Routing
// ===========================================================================
describe("Group 9: CORS / Routing", () => {
  it("29. OPTIONS /submit → 204, Access-Control-Allow-Origin: *", async () => {
    const res = await manager.fetch(
      new Request("http://localhost/submit", { method: "OPTIONS" })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("30. GET /nonexistent → 404", async () => {
    const res = await manager.fetch(
      new Request("http://localhost/nonexistent", { method: "GET" })
    );
    expect(res.status).toBe(404);
  });

  it("31. POST /health → 404 (wrong method)", async () => {
    const res = await manager.fetch(
      new Request("http://localhost/health", { method: "POST" })
    );
    expect(res.status).toBe(404);
  });

  it("32. JSON responses have Content-Type and CORS headers", async () => {
    const txBytes = makeSignedPayTxn();
    setSimulateSuccess();
    const res = await manager.fetch(submitReq([toBase64(txBytes)]));
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

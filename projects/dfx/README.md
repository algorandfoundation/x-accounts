# dfx — Deferred Execution Service

A Cloudflare Worker + Durable Object that accepts signed Algorand transactions, simulates them, and — if they fail due to insufficient balance — stores them for automatic retry until they become valid or expire.

## How it works

1. **Submit** — `POST /submit` with `{ "signedTxns": ["<base64>", ...] }`
2. **Simulate** — the transaction group is simulated against mainnet algod
3. **Outcome**:
   - **Success** — returns `{ "status": "submitted" }`
   - **Insufficient balance** — stored as pending, returns `{ "status": "deferred", "txId": "..." }`
   - **Other failure** — rejected with `{ "status": "invalid", "error": "..." }`
4. **Poll** — a Durable Object alarm re-simulates pending transactions every 4 seconds, submitting them when they become valid or removing them when they expire (past `lastValid` round) or fail for non-balance reasons

## API

| Method    | Path      | Description                       |
| --------- | --------- | --------------------------------- |
| `POST`    | `/submit` | Submit a signed transaction group |
| `GET`     | `/health` | Returns `{ pending, lastRound }`  |
| `OPTIONS` | `*`       | CORS preflight (returns 204)      |

All responses include `Content-Type: application/json` and CORS headers (`Access-Control-Allow-Origin: *`).

## Architecture

- **Worker** (`src/index.ts`) — thin router that forwards all requests to a singleton Durable Object
- **DfxManager** (`src/DfxManager.ts`) — Durable Object holding pending transaction state, simulation logic, and the polling alarm

## Development

```bash
pnpm dev       # local dev server (wrangler)
pnpm build     # type-check
pnpm test      # run vitest suite
pnpm deploy    # deploy to Cloudflare
```

## Privacy

The service does not read, store, or log any user-identifying request metadata. IP addresses, User-Agent headers, and Referer headers are never accessed. The only data stored is the signed transaction bytes submitted by the caller. Operational logs contain only Algorand-specific information (transaction IDs, sender addresses, round numbers).

## Testing

Tests live in `test/DfxManager.test.ts` and run with Vitest in plain Node.js (no Cloudflare runtime needed). The test suite mocks `AlgorandClient` and uses a fake in-memory `DurableObjectState`, exercising `DfxManager` as a class directly.

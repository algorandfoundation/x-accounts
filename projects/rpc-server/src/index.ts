import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { AlgoXEvmSdk } from "algo-x-evm-sdk"

const algorand = AlgorandClient.mainNet()
const sdk = new AlgoXEvmSdk({ algorand })

interface RpcRequest {
  id?: unknown
  jsonrpc?: string
  method?: string
  params?: unknown[]
}

interface EthCallParams {
  to?: string
  data?: string
}

// ERC-20 function selectors (first 4 bytes of keccak256 of signature)
const SEL_NAME = "06fdde03"
const SEL_SYMBOL = "95d89b41"
const SEL_DECIMALS = "313ce567"
const SEL_BALANCE_OF = "70a08231"
const SEL_TRANSFER = "a9059cbb"
const SEL_APPROVE = "095ea7b3"
const SEL_TRANSFER_FROM = "23b872dd"

const TRANSACTION_SITE_URL = "https://xchain.algorand.co"
const DIRECT_TX_ERROR = `Direct transactions are not supported on this network. Please use ${TRANSACTION_SITE_URL} to send tokens.`

/**
 * Extract ASA ID from an EVM "contract" address.
 * Decimal ASA IDs are transliterated as hex digit characters, e.g.
 * ASA 2726252423 → 0x0000000000000000000000000000002726252423
 */
function addressToAsaId(address: string): bigint {
  const digits = address.replace(/^0x/i, "").replace(/^0+/, "") || "0"
  if (!/^\d+$/.test(digits)) {
    throw new Error(`Address ${address} is not a valid ASA token address. ${DIRECT_TX_ERROR}`)
  }
  return BigInt(digits) // decimal interpretation of the digit string
}

/** ABI-encode a dynamic string return value. */
function abiEncodeString(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const paddedLen = Math.ceil(bytes.length / 32) * 32 || 32
  const padded = new Uint8Array(paddedLen)
  padded.set(bytes)
  return (
    "0x" + 32n.toString(16).padStart(64, "0") + BigInt(bytes.length).toString(16).padStart(64, "0") + bytesToHex(padded)
  )
}

/** ABI-encode a uint256 return value. */
function abiEncodeUint256(value: bigint): string {
  return "0x" + value.toString(16).padStart(64, "0")
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (const b of bytes) hex += b.toString(16).padStart(2, "0")
  return hex
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405)
    }

    const body = await request.json<RpcRequest>()
    console.log(`RPC request: ${body.method}`)

    if (body.method === "eth_chainId") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x1040" })
    }

    if (body.method === "eth_blockNumber") {
      try {
        const status = await algorand.client.algod.status().do()
        const round = BigInt(status.lastRound)
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x" + round.toString(16) })
      } catch {
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x1" })
      }
    }

    if (body.method === "eth_getBalance") {
      const evmAddress = body.params?.[0] as string | undefined
      if (!evmAddress) {
        return json({
          jsonrpc: "2.0",
          id: body.id ?? null,
          error: { code: -32602, message: "Missing address parameter" },
        })
      }
      try {
        const algoAddress = await sdk.getAddress({ evmAddress })
        const accountInfo = await algorand.client.algod.accountInformation(algoAddress).do()
        const microAlgos = BigInt(accountInfo.amount)
        const wei = microAlgos * 10n ** 12n
        console.log(`eth_getBalance ${evmAddress} -> ${algoAddress}: ${microAlgos} microAlgos (${wei} wei)`)
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x" + wei.toString(16) })
      } catch (e: unknown) {
        console.log(`eth_getBalance error for ${evmAddress}: ${e}`)
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x0" })
      }
    }

    if (body.method === "eth_getCode") {
      const address = body.params?.[0] as string | undefined
      if (!address) {
        return json({
          jsonrpc: "2.0",
          id: body.id ?? null,
          error: { code: -32602, message: "Missing address parameter" },
        })
      }
      try {
        const asaId = addressToAsaId(address)
        await algorand.client.algod.getAssetByID(asaId).do()
        // Valid ASA — return a minimal non-empty bytecode stub so MetaMask recognizes it as a contract
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0xfe" })
      } catch {
        // Not a valid ASA — return empty (EOA)
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x" })
      }
    }

    if (body.method === "eth_call") {
      const callParams = body.params?.[0] as EthCallParams | undefined
      if (!callParams?.to || !callParams?.data) {
        return json({
          jsonrpc: "2.0",
          id: body.id ?? null,
          error: { code: -32602, message: "Missing to/data in eth_call" },
        })
      }
      try {
        return await handleEthCall(body.id ?? null, callParams)
      } catch (e: unknown) {
        console.log(`eth_call error: ${e}`)
        return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32000, message: String(e) } })
      }
    }

    if (body.method === "eth_gasPrice") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x3b9aca00" })
    }

    if (body.method === "eth_getBlockByNumber") {
      return json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          number: "0x1",
          hash: "0x" + "0".repeat(64),
          parentHash: "0x" + "0".repeat(64),
          timestamp: "0x0",
          gasLimit: "0x1c9c380",
          gasUsed: "0x0",
          transactions: [],
        },
      })
    }

    if (body.method === "net_version") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "4160" })
    }

    if (body.method === "eth_sendRawTransaction" || body.method === "eth_sendTransaction") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32000, message: DIRECT_TX_ERROR } })
    }

    if (body.method === "eth_estimateGas") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32000, message: DIRECT_TX_ERROR } })
    }

    if (body.method === "eth_getTransactionCount") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x0" })
    }

    return json({
      jsonrpc: "2.0",
      id: body.id ?? null,
      error: { code: -32601, message: "Method not found" },
    })
  },
}

async function handleEthCall(id: unknown, params: EthCallParams): Promise<Response> {
  const asaId = addressToAsaId(params.to!)
  const selector = params.data!.replace(/^0x/i, "").slice(0, 8).toLowerCase()

  console.log(`eth_call: ASA ${asaId}, selector ${selector}`)

  if (selector === SEL_NAME) {
    const asset = await algorand.client.algod.getAssetByID(asaId).do()
    const name = asset.params.name ?? `ASA #${asaId}`
    console.log(`  name() -> "${name}"`)
    return json({ jsonrpc: "2.0", id, result: abiEncodeString(name) })
  }

  if (selector === SEL_SYMBOL) {
    const asset = await algorand.client.algod.getAssetByID(asaId).do()
    const symbol = asset.params.unitName ?? `ASA${asaId}`
    console.log(`  symbol() -> "${symbol}"`)
    return json({ jsonrpc: "2.0", id, result: abiEncodeString(symbol) })
  }

  if (selector === SEL_DECIMALS) {
    const asset = await algorand.client.algod.getAssetByID(asaId).do()
    const decimals = BigInt(asset.params.decimals)
    console.log(`  decimals() -> ${decimals}`)
    return json({ jsonrpc: "2.0", id, result: abiEncodeUint256(decimals) })
  }

  if (selector === SEL_BALANCE_OF) {
    // data layout: 4-byte selector + 32-byte address (left-padded to 32 bytes, last 20 bytes are the address)
    const dataHex = params.data!.replace(/^0x/i, "")
    const holderEvmAddress = "0x" + dataHex.slice(8 + 24, 8 + 64) // extract 20-byte address
    const algoAddress = await sdk.getAddress({ evmAddress: holderEvmAddress })

    try {
      const holding = await algorand.client.algod.accountAssetInformation(algoAddress, asaId).do()
      const amount = BigInt(holding.assetHolding?.amount ?? 0n)
      console.log(`  balanceOf(${holderEvmAddress}) -> ${amount} (algo addr: ${algoAddress})`)
      return json({ jsonrpc: "2.0", id, result: abiEncodeUint256(amount) })
    } catch {
      // Account not opted in or doesn't exist — balance is 0
      console.log(`  balanceOf(${holderEvmAddress}) -> 0 (not opted in, algo addr: ${algoAddress})`)
      return json({ jsonrpc: "2.0", id, result: abiEncodeUint256(0n) })
    }
  }

  if (selector === SEL_TRANSFER || selector === SEL_APPROVE || selector === SEL_TRANSFER_FROM) {
    return json({ jsonrpc: "2.0", id, error: { code: -32000, message: DIRECT_TX_ERROR } })
  }

  return json({ jsonrpc: "2.0", id, error: { code: -32000, message: `Unsupported ERC-20 selector: 0x${selector}` } })
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  })
}

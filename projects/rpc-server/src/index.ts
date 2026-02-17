import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { LiquidEvmSdk } from "liquid-accounts-evm";

const algorand = AlgorandClient.mainNet();
const sdk = new LiquidEvmSdk({ algorand });

interface RpcRequest {
  id?: unknown;
  jsonrpc?: string;
  method?: string;
  params?: unknown[];
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await request.json<RpcRequest>();
    console.log(`RPC request: ${body.method}`);

    if (body.method === "eth_chainId") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x1040" });
    }

    if (body.method === "eth_blockNumber") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x1" });
    }

    if (body.method === "eth_getBalance") {
      const evmAddress = body.params?.[0] as string | undefined;
      if (!evmAddress) {
        return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32602, message: "Missing address parameter" } });
      }
      try {
        const algoAddress = await sdk.getAddress({ evmAddress });
        const accountInfo = await algorand.client.algod.accountInformation(algoAddress).do();
        const microAlgos = BigInt(accountInfo.amount);
        const wei = microAlgos * 10n ** 12n;
        console.log(`eth_getBalance ${evmAddress} -> ${algoAddress}: ${microAlgos} microAlgos (${wei} wei)`);
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x" + wei.toString(16) });
      } catch (e: unknown) {
        console.log(`eth_getBalance error for ${evmAddress}: ${e}`);
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x0" });
      }
    }

    if (body.method === "eth_gasPrice") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "0x3b9aca00" });
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
      });
    }

    if (body.method === "net_version") {
      return json({ jsonrpc: "2.0", id: body.id ?? null, result: "4160" });
    }

    return json({
      jsonrpc: "2.0",
      id: body.id ?? null,
      error: { code: -32601, message: "Method not found" },
    });
  },
};

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

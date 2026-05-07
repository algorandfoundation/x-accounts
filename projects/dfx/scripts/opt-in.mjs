#!/usr/bin/env node
import algosdk from 'algosdk'

const USAGE = `Usage: node scripts/opt-in.mjs <asset-id> [--rounds <validity>] [--url <endpoint>] [--mnemonic <phrase>]

Options:
  --rounds     Transaction validity window in rounds (default: 1000)
  --url        DFX endpoint (default: http://localhost:8787)
  --mnemonic   25-word mnemonic phrase (default: generate new account)`

function parseArgs() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0] === '--help') {
    console.log(USAGE)
    process.exit(0)
  }

  const assetId = BigInt(args[0])
  let rounds = 1000
  let url = 'http://localhost:8787'
  let mnemonic = null

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--rounds' && args[i + 1]) {
      rounds = parseInt(args[++i], 10)
    } else if (args[i] === '--url' && args[i + 1]) {
      url = args[++i]
    } else if (args[i] === '--mnemonic' && args[i + 1]) {
      // Consume all remaining words until next flag or end
      const words = []
      while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        words.push(args[++i])
      }
      mnemonic = words.join(' ')
    }
  }

  return { assetId, rounds, url, mnemonic }
}

async function main() {
  const { assetId, rounds, url, mnemonic: providedMnemonic } = parseArgs()

  let acct
  if (providedMnemonic) {
    acct = algosdk.mnemonicToSecretKey(providedMnemonic)
    console.log(`Address:  ${acct.addr.toString()}`)
  } else {
    acct = algosdk.generateAccount()
    console.log(`Address:  ${acct.addr.toString()}`)
    console.log(`Mnemonic: ${algosdk.secretKeyToMnemonic(acct.sk)}`)
  }
  console.log()

  // Fetch suggested params from algod via the worker's network
  // We build params manually since we don't have direct algod access
  const algod = new algosdk.Algodv2('', 'https://mainnet-api.4160.nodely.dev', '')
  const sp = await algod.getTransactionParams().do()
  sp.lastValid = sp.firstValid + BigInt(rounds)

  console.log(`First valid: ${sp.firstValid}`)
  console.log(`Last valid:  ${sp.lastValid} (${rounds} rounds)`)
  console.log(`Asset ID:    ${assetId}`)
  console.log()

  // Opt-in = 0-amount asset transfer to self
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: acct.addr.toString(),
    receiver: acct.addr.toString(),
    amount: 0,
    assetIndex: assetId,
    suggestedParams: sp,
  })

  const signed = txn.signTxn(acct.sk)
  const b64 = Buffer.from(signed).toString('base64')

  // POST to DFX
  console.log(`Submitting to ${url}/submit ...`)
  const res = await fetch(`${url}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTxns: [b64] }),
  })

  const body = await res.json()
  console.log(`Response (${res.status}):`, JSON.stringify(body, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

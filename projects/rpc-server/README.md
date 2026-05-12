# RPC Server

Mock Ethereum JSON-RPC server that lets MetaMask Mobile connect to Algorand as a custom network. Deployed as a Cloudflare Worker.

## Supported Methods

| Method                 | Response                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `eth_chainId`          | `0x1040` (4160)                                                                                |
| `net_version`          | `4160`                                                                                         |
| `eth_blockNumber`      | `0x1`                                                                                          |
| `eth_gasPrice`         | `0x3b9aca00` (1 gwei)                                                                          |
| `eth_getBlockByNumber` | Minimal mock block                                                                             |
| `eth_getBalance`       | Real ALGO balance from Algorand mainnet, converted from 6-decimal microAlgos to 18-decimal wei |

For `eth_getBalance`, the server uses [algo-x-evm-sdk](../evm-sdk/) to derive the Algorand address from the EVM address, then queries Algorand mainnet via algod.

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

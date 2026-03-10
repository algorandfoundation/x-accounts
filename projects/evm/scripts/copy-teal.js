import fs from "fs";
import path from "path";

const src = path.resolve(
  import.meta.dirname,
  "../src/smart_contracts/artifacts/liquidevm/LiquidEvmLsig.teal",
);
const tealTs = path.resolve(import.meta.dirname, "../src/teal.ts");

const teal = fs.readFileSync(src, "utf8");

const banner = `/**
 * @module avm-x-evm/teal
 * 
 * This module provides the TEAL (Transaction Execution Approval Language) source code for
 * the Liquid Accounts LogicSig.
 * 
 * ### What is TEAL?
 * TEAL is the assembly-like bytecode language used by the Algorand Virtual Machine (AVM) 
 * to execute smart contracts and logic signatures. In this context, it defines the 
 * validation logic that determines whether a transaction signed by an EVM wallet is valid.
 * 
 * ### What this TEAL does:
 * The \`LIQUID_EVM_LSIG_TEAL\` template is used to create a LogicSig account that is 
 * cryptographically tied to an Ethereum address. It performs the following steps:
 * 1. **Payload Selection**: Determines the 32-byte payload to verify. For a single 
 *    transaction, it uses the \`TxID\`. For a transaction group, it uses the \`GroupID\`.
 * 2. **Signature Parsing**: Extracts the \`r\`, \`s\`, and \`v\` components from the 
 *    LogicSig's first argument (\`arg_0\`). It expects a 1-byte type prefix (\`0x01\`).
 * 3. **EIP-712 Hashing**: Reconstructs the EIP-712 compliant message hash using 
 *    \`keccak256\`. This includes the domain separator and the structured data 
 *    representing the Algorand transaction(s).
 * 4. **Public Key Recovery**: Uses the \`ecdsa_pk_recover\` opcode (Secp256k1) to 
 *    recover the Ethereum public key from the signature and the generated hash.
 * 5. **Address Verification**: Hashes the recovered public key to derive the 
 *    Ethereum address and compares it against the \`TMPL_OWNER\` template variable.
 * 
 * The transaction is approved only if the recovered Ethereum address matches the 
 * intended owner's address.
 * 
 * @see {@link https://dev.algorand.co/concepts/smart-contracts/languages/teal/ | TEAL Documentation}
 * @see {@link https://eips.ethereum.org/EIPS/eip-712 | EIP-712: Typed structured data hashing and signing}
 */
`
fs.writeFileSync(tealTs, `${banner}export const LIQUID_EVM_LSIG_TEAL = ` + JSON.stringify(teal) + ";\n");

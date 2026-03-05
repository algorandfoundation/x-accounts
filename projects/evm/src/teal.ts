/**
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
 * The `LIQUID_EVM_LSIG_TEAL` template is used to create a LogicSig account that is 
 * cryptographically tied to an Ethereum address. It performs the following steps:
 * 1. **Payload Selection**: Determines the 32-byte payload to verify. For a single 
 *    transaction, it uses the `TxID`. For a transaction group, it uses the `GroupID`.
 * 2. **Signature Parsing**: Extracts the `r`, `s`, and `v` components from the 
 *    LogicSig's first argument (`arg_0`). It expects a 1-byte type prefix (`0x01`).
 * 3. **EIP-712 Hashing**: Reconstructs the EIP-712 compliant message hash using 
 *    `keccak256`. This includes the domain separator and the structured data 
 *    representing the Algorand transaction(s).
 * 4. **Public Key Recovery**: Uses the `ecdsa_pk_recover` opcode (Secp256k1) to 
 *    recover the Ethereum public key from the signature and the generated hash.
 * 5. **Address Verification**: Hashes the recovered public key to derive the 
 *    Ethereum address and compares it against the `TMPL_OWNER` template variable.
 * 
 * The transaction is approved only if the recovered Ethereum address matches the 
 * intended owner's address.
 * 
 * @see {@link https://dev.algorand.co/concepts/smart-contracts/languages/teal/ | TEAL Documentation}
 * @see {@link https://eips.ethereum.org/EIPS/eip-712 | EIP-712: Typed structured data hashing and signing}
 */
export const LIQUID_EVM_LSIG_TEAL = "#pragma version 11\n#pragma typetrack false\n\n// src/smart_contracts/liquidevm/logicsig.algo.ts::program() -> uint64:\nmain:\n    bytecblock TMPL_OWNER\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:42\n    // const txnIdPayload = Global.groupSize === 1 ? Txn.txId : Global.groupId;\n    global GroupSize\n    pushint 1 // 1\n    ==\n    bz main_ternary_false@2\n    txn TxID\n\nmain_ternary_merge@3:\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:45\n    // const sig = op.arg(0);\n    arg_0\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:50\n    // assert(op.extract(sig, 0, 1) === Bytes.fromHex(\"01\"));\n    dup\n    extract 0 1\n    pushbytes 0x01\n    ==\n    assert\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:52\n    // const r = op.extract(sig, 1, 32);\n    dup\n    extract 1 32\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:53\n    // const s = op.extract(sig, 33, 32);\n    dig 1\n    extract 33 32\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:54\n    // const v = op.btoi(op.extract(sig, 65, 1));\n    uncover 2\n    pushint 65 // 65\n    getbyte\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:55\n    // const recoveryId: uint64 = v - 27; // Ethereum uses 27/28, AVM expects 0/1\n    pushint 27 // 27\n    -\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:76\n    // const messageHash = op.keccak256(messageTypeHash.concat(txnIdPayload));\n    pushbytes 0xa0d3cab9c111e1025e8e6c24067ada7c8fff46e1696e611a8b2e5049bac4baf6\n    uncover 4\n    concat\n    keccak256\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:81\n    // const digest = op.keccak256(Bytes.fromHex(\"1901\").concat(domainSeparator).concat(messageHash));\n    pushbytes 0x1901cd2715b67ae987618a9e27b3a29c522b1171fd767b2224547d03747eae76adc6\n    swap\n    concat\n    keccak256\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:84\n    // const [pubkeyX, pubkeyY] = op.ecdsaPkRecover(op.Ecdsa.Secp256k1, digest, recoveryId, r, s);\n    swap\n    uncover 3\n    uncover 3\n    ecdsa_pk_recover Secp256k1\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:88\n    // const recoveredAddress = op.extract(op.keccak256(op.concat(pubkeyX, pubkeyY)), 12, 20);\n    concat\n    keccak256\n    extract 12 20\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:91\n    // return recoveredAddress === owner.bytes;\n    bytec_0 // TMPL_OWNER\n    ==\n    return\n\nmain_ternary_false@2:\n    // src/smart_contracts/liquidevm/logicsig.algo.ts:42\n    // const txnIdPayload = Global.groupSize === 1 ? Txn.txId : Global.groupId;\n    global GroupID\n    b main_ternary_merge@3\n";

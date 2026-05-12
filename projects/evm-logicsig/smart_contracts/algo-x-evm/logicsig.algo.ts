/**
 * xChain EVM LogicSig
 *
 * A LogicSig that allows Ethereum wallet addresses to control Algorand accounts.
 * The contract verifies ECDSA (secp256k1) signatures from an Ethereum address,
 * enabling MetaMask and other EVM wallets to sign Algorand transactions.
 *
 * How it works:
 * 1. The EVM wallet signs the transaction/group ID using EIP-712 typed structured data
 * 2. A type byte (0x01) followed by the signature (R, S, V) is passed as arg0 to the LogicSig
 * 3. The contract recovers the signer's public key using ecdsaPkRecover
 * 4. It derives the Ethereum address from the recovered public key
 * 5. Transaction is approved if the derived address matches the template owner
 *
 * EIP-712 Domain:
 * - name: "Algorand x EVM"
 * - version: "1"
 *
 * EIP-712 Message Type:
 * - Algorand Transaction(bytes32 Transaction ID)
 */
import { assert, Bytes, Global, LogicSig, op, TemplateVar, Txn, uint64 } from "@algorandfoundation/algorand-typescript"
import { StaticBytes } from "@algorandfoundation/algorand-typescript/arc4"

// Template variable: the 20-byte Ethereum address that controls this LogicSig
const owner = TemplateVar<StaticBytes<20>>("OWNER")

export class AlgoXEvmLsig extends LogicSig {
  public program() {
    // Payload to sign is the 32-byte transaction group ID (if group size > 1)
    // otherwise the transaction ID of the current transaction
    const txnIdPayload = Global.groupSize === 1 ? Txn.txId : Global.groupId

    // Parse arg0: Type (1 byte) || R (32 bytes) || S (32 bytes) || V (1 byte)
    const sig = op.arg(0)

    // Verify type byte is 0x01 (EVM signature type).
    // The type byte allows future multi-scheme LogicSigs that branch on signature type
    // (e.g. 0x01 = EVM secp256k1, 0x02 = Passkey secp256r1), enabling composed auth.
    assert(op.extract(sig, 0, 1) === Bytes.fromHex("01"))

    const r = op.extract(sig, 1, 32)
    const s = op.extract(sig, 33, 32)
    const v = op.btoi(op.extract(sig, 65, 1))
    const recoveryId: uint64 = v - 27 // Ethereum uses 27/28, AVM expects 0/1

    // EIP-712 Domain Separator (precomputed off-chain)
    // domainSeparator = keccak256(domainTypeHash + nameHash + versionHash)
    // where:
    //   domainTypeHash = keccak256("EIP712Domain(string name,string version)")
    //   nameHash = keccak256("Algorand x EVM")
    //   versionHash = keccak256("1")
    // Value: 0xcef8b9829414ba4a13ea8f8c442b747ffe119c643d2213d22b4e137036a2d573

    // EIP-712 Message Type Hash (precomputed off-chain)
    // messageTypeHash = keccak256("Algorand Transaction(bytes32 Transaction ID)")
    // Value: 0x612f2598ebd964c16ba67a8b06d6f08ce24ab0911f0ff5a267a22fe01e687334
    const domainSeparator = Bytes.fromHex("cef8b9829414ba4a13ea8f8c442b747ffe119c643d2213d22b4e137036a2d573")
    const messageTypeHash = Bytes.fromHex("612f2598ebd964c16ba67a8b06d6f08ce24ab0911f0ff5a267a22fe01e687334")

    const messageHash = op.keccak256(messageTypeHash.concat(txnIdPayload))

    // EIP-712 Final Digest
    // digest = keccak256("\x19\x01" + domainSeparator + messageHash)
    // Seeming inefficiency is optimized by puya -  0x1901 is concatted with domainSeparator since both are constants
    const digest = op.keccak256(Bytes.fromHex("1901").concat(domainSeparator).concat(messageHash))

    // Recover the signer's public key from the signature using ECDSA secp256k1
    const [pubkeyX, pubkeyY] = op.ecdsaPkRecover(op.Ecdsa.Secp256k1, digest, recoveryId, r, s)

    // Derive the Ethereum address from the recovered public key
    // Ethereum address = last 20 bytes of keccak256(pubkeyX || pubkeyY)
    const recoveredAddress = op.extract(op.keccak256(op.concat(pubkeyX, pubkeyY)), 12, 20)

    // Approve the transaction if the recovered address matches the template owner
    return recoveredAddress === owner.bytes
  }
}

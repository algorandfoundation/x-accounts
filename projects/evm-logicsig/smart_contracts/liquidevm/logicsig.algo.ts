/**
 * Liquid EVM LogicSig
 * 
 * A LogicSig that allows Ethereum wallet addresses to control Algorand accounts.
 * The contract verifies ECDSA (secp256k1) signatures from an Ethereum address,
 * enabling MetaMask and other EVM wallets to sign Algorand transactions.
 * 
 * How it works:
 * 1. The EVM wallet signs the transaction/group ID using Ethereum's personal_sign
 * 2. The signature (R, S, V) is passed as arg0 to the LogicSig
 * 3. The contract recovers the signer's public key using ecdsaPkRecover
 * 4. It derives the Ethereum address from the recovered public key
 * 5. Transaction is approved if the derived address matches the template owner
 */

import { Bytes, Global, LogicSig, op, TemplateVar, Txn, uint64 } from '@algorandfoundation/algorand-typescript'
import { StaticBytes } from '@algorandfoundation/algorand-typescript/arc4'

// Template variable: the 20-byte Ethereum address that controls this LogicSig
const owner = TemplateVar<StaticBytes<20>>('OWNER')

export class LiquidEvmLsig extends LogicSig {
  public program() {
    // Payload to sign is the 32-byte transaction group ID (if group size > 1) 
    // otherwise the transaction ID of the current transaction
    const txnIdPayload = Global.groupSize === 1 ? Txn.txId : Global.groupId

    // Parse the concatenated ECDSA signature from arg0: R (32 bytes) || S (32 bytes) || V (1 byte)
    const sig = op.arg(0)
    const r = op.extract(sig, 0, 32)
    const s = op.extract(sig, 32, 32)
    const v = op.btoi(op.extract(sig, 64, 1))
    const recoveryId: uint64 = v - 27  // Ethereum uses 27/28, AVM expects 0/1

    // Construct the Ethereum personal_sign message digest
    // Format: keccak256("\x19Ethereum Signed Message:\n32" + txnIdPayload)
    const digest = op.keccak256(Bytes('\x19Ethereum Signed Message:\n32').concat(txnIdPayload))

    // Recover the signer's public key from the signature using ECDSA secp256k1
    const [pubkeyX, pubkeyY] = op.ecdsaPkRecover(op.Ecdsa.Secp256k1, digest, recoveryId, r, s)

    // Derive the Ethereum address from the recovered public key
    // Ethereum address = last 20 bytes of keccak256(pubkeyX || pubkeyY)
    const recoveredAddress = op.extract(op.keccak256(op.concat(pubkeyX, pubkeyY)), 12, 20)

    // Approve the transaction if the recovered address matches the template owner
    return recoveredAddress === owner.bytes
  }
}

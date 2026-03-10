import type { ExtensionOptions, Provider } from "@algorandfoundation/wallet-provider";
import type { Store } from "@tanstack/store";
import type { HookCollection } from "before-after-hook";
import type { AlgorandClient } from "@algorandfoundation/algokit-utils";
import type { LiquidEvmSdk } from "./index.ts";
import type { SignTypedDataParams } from "./utils.ts";
import type algosdk from "algosdk";

/**
 * Context for the Algorand EVM extension, combining the base provider with
 * account store and EVM-specific extensions.
 */
export type AlgorandEVMContext<T> = Provider<any> &
  AccountStoreExtension<T> &
  AlgorandEVMAccountExtension;

/**
 * Extension for Algorand EVM accounts, providing access to {@link AlgorandClient}
 * and EVM-specific account functionality.
 */
export interface AlgorandEVMAccountExtension {
  /**
   * The Algorand client instance used for network interactions.
   */
  algorand: AlgorandClient;
  /**
   * Account-related operations and state, including EVM-specific functionality.
   */
  account: AccountStoreExtension<AlgorandEVMAccount | Account>["account"] & {
    /**
     * EVM-specific SDK and account management.
     */
    evm: LiquidEvmSdk & {
      /**
       * Adds an EVM account to the store.
       * @param evmAddress - The 0x-prefixed hex EVM address.
       */
      addEvmAccount: (evmAddress: string) => Promise<void>;
    };
  };
}

/**
 * Represents an Algorand account derived from an EVM address.
 */
export interface AlgorandEVMAccount extends Account {
  /**
   * Signs transactions using the associated EVM account.
   *
   * @param params - The signing parameters, omitting the `evmAddress` as it's implied by the account.
   * @returns A promise that resolves to an array of signed transaction blobs.
   */
  signTxn: (
    params: Omit<TxnsWithSignature, "evmAddress"> | Omit<TxnsWithSignMessage, "evmAddress">,
  ) => Promise<Uint8Array<ArrayBufferLike>[]>;
}

/**
 * Parameters for signing transactions with a pre-computed signature.
 */
export type TxnsWithSignature = {
  /**
   * The 0x-prefixed hex EVM address associated with the account.
   */
  evmAddress: string;
  /**
   * The array of {@link algosdk.Transaction} objects to sign.
   */
  txns: algosdk.Transaction[];
  /**
   * The pre-computed EIP-712 signature (0x-prefixed 65-byte hex string).
   */
  signature: string;
};

/**
 * Parameters for signing transactions with a `signMessage` callback.
 */
export type TxnsWithSignMessage = {
  /**
   * The 0x-prefixed hex EVM address associated with the account.
   */
  evmAddress: string;
  /**
   * The array of {@link algosdk.Transaction} objects to sign.
   */
  txns: algosdk.Transaction[];
  /**
   * A callback function that receives {@link SignTypedDataParams} and returns an EIP-712 signature string.
   */
  signMessage: (typedData: SignTypedDataParams) => Promise<string>;
};

/////////////////// WIP Accounts Shapes /////////////////////////////

/**
 * Options for the AccountStore extension.
 */
export interface AccountStoreOptions<T> extends ExtensionOptions {
  accounts: {
    store: Store<AccountStoreState<T>>;
    hooks: HookCollection<any>;
  };
}

export type AccountType = "ed25519" | "lsig" | "falcon" | string;

export interface AccountAsset {
  id: string;
  name: string;
  type: string;
  balance: bigint;
  metadata: Record<string, any>;
}

/**
 * Represents an account that can sign transactions.
 */
export interface Account {
  /**
   * The public address of the account.
   */
  address: string;

  /**
   *
   */
  balance: bigint;

  /**
   *
   */
  assets: AccountAsset[];

  /**
   * Type of account
   */
  type: AccountType;

  /**
   * Subclass via the metadata
   */
  metadata?: Record<string, any>;
}

/**
 * The state of the account store.
 */
export interface AccountStoreState<T> {
  /**
   * The list of accounts in the store.
   */
  accounts: T[];
}

/**
 * Represents an account store interface for managing accounts.
 */
export interface AccountStoreExtension<T> extends AccountStoreState<T> {
  /**
   * An object that represents additional functionality provided by this extension.
   */
  account: {
    store: AccountStoreApi<T>;
  };
}

/**
 * Interface representing an AccountStore extension API.
 */
export interface AccountStoreApi<T> {
  /**
   * Adds an account to the store.
   *
   * @param account - The account to add.
   * @returns The added account.
   */
  addAccount: (account: T) => Promise<T>;
  /**
   * Removes an account from the store by its address.
   *
   * @param address - The address of the account to remove.
   * @returns A promise that resolves when the account is removed.
   */
  removeAccount: (address: string) => Promise<void>;
  /**
   * Retrieves an account from the store by its address.
   *
   * @param address - The address of the account to retrieve.
   * @returns The account if found, otherwise undefined.
   */
  getAccount: (address: string) => Promise<T | undefined>;
  /**
   * Clears all accounts from the store.
   *
   * @returns A promise that resolves when the store is cleared.
   */
  clear: () => Promise<void>;
  /**
   * The hooks for account store operations.
   */
  hooks: HookCollection<any>;
}

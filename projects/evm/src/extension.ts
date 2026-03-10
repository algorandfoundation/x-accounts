/**
 * @module avm-x-evm/extension
 */
import { LiquidEvmSdk } from "./index.ts";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import type { Provider, ExtensionOptions } from "@algorandfoundation/wallet-provider";
import type {
  AccountStoreExtension,
  AlgorandEVMAccount,
  AlgorandEVMAccountExtension,
  AlgorandEVMContext,
} from "./types.ts";
/**
 * Enhances a provider with Algorand EVM account support.
 *
 * @param provider - The provider to enhance.
 * @param _options - Options for the EVM account extension (currently unused).
 * @returns The enhanced provider with EVM account management capabilities.
 */
export function WithXEVMAccounts(
  provider: Provider<any> & AccountStoreExtension<AlgorandEVMAccount> & AlgorandEVMAccountExtension,
  _options: ExtensionOptions, // TODO decide on the options for the EVM account
) {
  return {
    account: {
      ...provider.account,
      evm: provider?.account?.evm || {
        ...new LiquidEvmSdk({ algorand: provider.algorand || AlgorandClient.fromEnvironment() }),
        addEVMAccount: (evmAddress: string) => addEVMAccount({ provider, evmAddress }),
      },
    },
  } as AlgorandEVMAccountExtension;
}

/**
 * Adds an EVM-derived account to the provider's account store.
 *
 * @param params - The parameters for adding the account.
 * @param params.provider - The EVM context to add the account to.
 * @param params.evmAddress - The 0x-prefixed hex EVM address of the account to add.
 * @returns A promise that resolves to the added {@link AlgorandEVMAccount}.
 */
export async function addEVMAccount({
  provider,
  evmAddress,
}: {
  provider: AlgorandEVMContext<AlgorandEVMAccount>;
  evmAddress: string;
}): Promise<AlgorandEVMAccount> {
  return provider.account.store.addAccount({
    address: await provider.account.evm.getAddress({ evmAddress }),
    type: "avm-x-evm",
    balance: BigInt(0),
    assets: [],
    metadata: {
      "avm-x-evm-address": evmAddress,
    },
    signTxn: (params) => provider.account.evm.signTxn({ evmAddress, ...params }),
  });
}

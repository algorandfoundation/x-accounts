import tseslint from "typescript-eslint"
import globals from "globals"
import { baseConfig } from "../../eslint.config.base.mjs"

export default tseslint.config(
  { ignores: ["dist/", "test/"] },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...baseConfig,
  {
    files: ["*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
)

import tseslint from "typescript-eslint"
import globals from "globals"
import { baseConfig } from "../../eslint.config.base.mjs"

export default tseslint.config(
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/explicit-member-accessibility": "warn",
    },
  },
  ...baseConfig,
)

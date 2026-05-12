import tseslint from "typescript-eslint"
import globals from "globals"
import { baseConfig } from "../../eslint.config.base.mjs"

export default tseslint.config(
  { ignores: ["dist/"] },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...baseConfig,
)

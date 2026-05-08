import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import globals from "globals"
import { baseConfig } from "../../eslint.config.base.mjs"

export default tseslint.config(
  { ignores: ["dist/", "*.js"] },
  {
    files: ["src/**/*.ts"],
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  ...baseConfig,
)

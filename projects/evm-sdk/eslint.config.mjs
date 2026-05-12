import tseslint from "typescript-eslint"
import globals from "globals"
import { baseConfig } from "../../eslint.config.base.mjs"

export default tseslint.config(
  { ignores: ["dist/", "scripts/*.js"] },
  {
    files: ["src/**/*.ts"],
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

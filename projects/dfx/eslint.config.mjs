import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { baseConfig } from '../../eslint.config.base.mjs'

export default tseslint.config(
  { ignores: ['dist/', 'test/'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...baseConfig,
)

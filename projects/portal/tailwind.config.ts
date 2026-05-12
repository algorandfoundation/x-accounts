import type { Config } from "tailwindcss"
import tailwindAnimate from "tailwindcss-animate"
import typography from "@tailwindcss/typography"

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    // Scan algo-x-evm-ui components so Tailwind generates their utility classes
    // TODO offer a tailwind preset export from algo-x-evm-ui
    "../use-wallet-ui/packages/algo-x-evm-ui/src/**/*.{ts,tsx}",
    // Scan use-wallet-ui-react components (WalletButton, ConnectWalletMenu, etc.)
    "../use-wallet-ui/packages/react/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Algorand brand palette
        "algo-teal": {
          10: "#E7FAF9",
          20: "#D1F4F4",
          30: "#B9EFEE",
          40: "#A2EAE8",
          50: "#8BE4E2",
          60: "#74DFDD",
          70: "#5CDAD7",
          80: "#45D5D1",
          90: "#2ECFCC",
          DEFAULT: "#17CAC6",
        },
        "algo-blue": {
          10: "#E9E9FD",
          20: "#D4D4FA",
          30: "#BFBFF9",
          40: "#A9A9F6",
          50: "#9595F5",
          60: "#8080F3",
          70: "#6C6CF1",
          80: "#5858F0",
          90: "#4444ED",
          DEFAULT: "#2D2DF1",
        },
        "algo-black": {
          10: "#E5E7E9",
          20: "#CCD0D3",
          30: "#B2B8BD",
          40: "#99A1A7",
          50: "#7F8991",
          60: "#66717C",
          70: "#4C5965",
          80: "#334250",
          90: "#192A39",
          DEFAULT: "#001324",
        },
        "algo-orange": "#FF7F48",
        "algo-yellow": "#FFE248",
        "algo-green": "#01DC94",
        "algo-red": "#FF2C2C",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindAnimate, typography],
} satisfies Config

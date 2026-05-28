import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta A — verde-petróleo (principal)
        primary: {
          900: "#143733",
          DEFAULT: "#1F4E4A",
          700: "#2A6B65",
          500: "#3D8C84",
          100: "#D6EBE8",
          50:  "#EEF6F4",
        },
        accent: {
          DEFAULT: "#E07A35",
          100:     "#FBE6D6",
        },
        success: "#2F9E64",
        error:   "#C44545",
        warn:    "#D9A23A",
      },
      fontFamily: {
        manrope: ["var(--font-manrope)", "system-ui", "sans-serif"],
        inter:   ["var(--font-inter)",   "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "ui-monospace", "monospace"],
      },
      borderRadius: {
        soft:  "6px",
        round: "10px",
      },
      letterSpacing: {
        tighter: "-0.025em",
        tight:   "-0.02em",
        snug:    "-0.01em",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}

export default config


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "oklch(0.92 0.004 286.32)",
        input: "oklch(0.92 0.004 286.32)",
        ring: "oklch(0.702 0.183 293.541)",
        background: "oklch(1 0 0)",
        foreground: "oklch(0.141 0.005 285.823)",
        primary: {
          DEFAULT: "oklch(0.541 0.281 293.009)",
          foreground: "oklch(0.969 0.016 293.756)",
        },
        secondary: {
          DEFAULT: "oklch(0.967 0.001 286.375)",
          foreground: "oklch(0.21 0.006 285.885)",
        },
        destructive: {
          DEFAULT: "oklch(0.577 0.245 27.325)",
          foreground: "oklch(0.969 0.016 293.756)",
        },
        muted: {
          DEFAULT: "oklch(0.967 0.001 286.375)",
          foreground: "oklch(0.552 0.016 285.938)",
        },
        accent: {
          DEFAULT: "oklch(0.967 0.001 286.375)",
          foreground: "oklch(0.21 0.006 285.885)",
        },
        popover: {
          DEFAULT: "oklch(1 0 0)",
          foreground: "oklch(0.141 0.005 285.823)",
        },
        card: {
          DEFAULT: "oklch(1 0 0)",
          foreground: "oklch(0.141 0.005 285.823)",
        },
      },
      boxShadow: {
        'sm': '0 2px 8px 0 oklch(0 0 0 / 0.01)',
        'md': '0 4px 12px -2px oklch(0 0 0 / 0.03), 0 2px 6px -2px oklch(0 0 0 / 0.02)',
        'lg': '0 12px 24px -6px oklch(0 0 0 / 0.04), 0 4px 12px -4px oklch(0 0 0 / 0.02)',
        'xl': '0 20px 32px -8px oklch(0 0 0 / 0.05), 0 8px 16px -6px oklch(0 0 0 / 0.02)',
        '2xl': '0 32px 48px -12px oklch(0 0 0 / 0.08), 0 16px 24px -8px oklch(0 0 0 / 0.04)',
        'soft': '0 10px 40px -6px oklch(0 0 0 / 0.04)',
        'soft-primary': '0 20px 40px -10px oklch(0.541 0.281 293.009 / 0.15)',
        'inner-soft': 'inset 0 2px 4px 0 oklch(0 0 0 / 0.02)',
      },
      borderRadius: {
        lg: "0.65rem",
        md: "calc(0.65rem - 2px)",
        sm: "calc(0.65rem - 4px)",
      },
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      }
    }
  },
  plugins: [],
}

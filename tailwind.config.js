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
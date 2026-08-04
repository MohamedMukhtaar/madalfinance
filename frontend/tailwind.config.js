/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Semantic tokens — switch automatically with html.dark via CSS vars
        app: "var(--color-app)",
        panel: "var(--color-panel)",
        card: "var(--color-card)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        ink: {
          DEFAULT: "var(--color-ink)",
          soft: "var(--color-ink-soft)",
          muted: "var(--color-ink-muted)",
        },
        active: "var(--color-active)",
        // Madal brand (fixed hex — always the same)
        navy: {
          DEFAULT: "#101848",
          50: "#eef0f7",
          100: "#d5d9ea",
          200: "#aab3d5",
          300: "#6b78b0",
          400: "#3d4a86",
          500: "#1a255c",
          600: "#101848",
          700: "#0d143a",
          800: "#0a1030",
          900: "#070b22",
          950: "#040614",
        },
        accent: {
          DEFAULT: "#74bcf8",
          50: "#eef7fe",
          100: "#d9eefc",
          200: "#b6ddfa",
          300: "#8ecaf9",
          400: "#74bcf8",
          500: "#4aa6ef",
          600: "#2b8fd9",
        },
        brand: {
          50: "#eef7fe",
          100: "#d9eefc",
          200: "#b6ddfa",
          300: "#8ecaf9",
          400: "#74bcf8",
          500: "#4aa6ef",
          600: "#101848",
          700: "#0d143a",
          800: "#0a1030",
          900: "#070b22",
          950: "#040614",
        },
        primary: {
          DEFAULT: "#101848",
          50: "#eef0f7",
          100: "#d5d9ea",
          200: "#aab3d5",
          300: "#6b78b0",
          400: "#3d4a86",
          500: "#1a255c",
          600: "#101848",
          700: "#0d143a",
          800: "#0a1030",
          900: "#070b22",
          950: "#040614",
        },
        secondary: {
          DEFAULT: "#74bcf8",
          50: "#eef7fe",
          100: "#d9eefc",
          200: "#b6ddfa",
          300: "#8ecaf9",
          400: "#74bcf8",
          500: "#4aa6ef",
          600: "#2b8fd9",
          700: "#1f71b0",
          800: "#1c5a8c",
          900: "#1a4b73",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          800: "#0a1030",
          900: "#070b22",
          950: "#040614",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 72, 0.04), 0 1px 3px rgba(16, 24, 72, 0.06)",
        "card-hover":
          "0 4px 8px rgba(16, 24, 72, 0.05), 0 12px 28px rgba(16, 24, 72, 0.10)",
        pop: "0 8px 16px rgba(16, 24, 72, 0.08), 0 24px 48px rgba(16, 24, 72, 0.16)",
        "glow-blue": "0 8px 28px rgba(116, 188, 248, 0.35)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease both",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #74bcf8 0%, #4aa6ef 40%, #101848 100%)",
        "navy-gradient": "linear-gradient(160deg, #101848 0%, #070b22 100%)",
      },
    },
  },
  plugins: [],
};

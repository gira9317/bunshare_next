import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7c3aed",
          hover: "#6d28d9",
          light: "#8b5cf6",
        },
        secondary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        card: "var(--bg-primary)",
        "card-border": "var(--border-primary)",
        muted: "var(--bg-secondary)",
        "muted-foreground": "var(--text-secondary)",
        // グレー色をカスタマイズ
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6", 
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-in-out",
        "slide-down": "slideDown 0.3s ease-in-out",
        "tap-bounce": "tapBounce 0.12s ease-out",
        "tap-scale": "tapScale 0.12s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        tapBounce: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        tapScale: {
          "0%": { transform: "scale(1)", filter: "brightness(1)" },
          "100%": { transform: "scale(0.95)", filter: "brightness(0.9)" },
        },
      },
      maxWidth: {
        "8xl": "90rem",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [
    // カスタムコンポーネントクラスプラグイン
    function({ addComponents }: any) {
      addComponents({
        '.category-tag-brand': {
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            transform: 'scale(1.02)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          }
        },
        '.tap-feedback': {
          transition: 'transform 0.12s ease-out, filter 0.12s ease-out',
          willChange: 'transform, filter',
          transformOrigin: 'center',
          transformGpu: 'true',
          '&:active': {
            transform: 'scale(0.95)',
            filter: 'brightness(0.9)',
          }
        },
        '.tap-feedback-light': {
          transition: 'transform 0.12s ease-out, filter 0.12s ease-out',
          willChange: 'transform, filter',
          transformOrigin: 'center',
          '&:active': {
            transform: 'scale(0.98)',
            filter: 'brightness(0.95)',
          }
        }
      })
    }
  ],
} satisfies Config;
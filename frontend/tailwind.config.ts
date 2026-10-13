import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          raised: "var(--paper-raised)",
          sunken: "var(--paper-sunken)",
        },
        line: {
          DEFAULT: "var(--line)",
          soft: "var(--line-soft)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent-dark)",
          soft: "var(--accent-soft)",
        },
        seal: {
          DEFAULT: "var(--seal)",
          soft: "var(--seal-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        ficct: {
          navy: '#0B2545',
          'navy-dark': '#06162B',
          'navy-light': '#133863',
          'navy-surface': '#1B4273',
          'navy-subtle': '#F0F4F8',
          'navy-border': '#CBD8E6',
          green: '#4CA64B',
          'green-hover': '#3F8B3E',
          'green-dark': '#2E6E2D',
          'green-light': '#EBF6EB',
          'green-border': '#A7D7A6',
          white: '#FFFFFF',
          'dark-bg': '#060D17',
          'dark-surface': '#0D1C33',
          'dark-card': '#0F223D',
          'dark-border': '#1E3A5F',
        },
      },
      boxShadow: {
        'ficct-sm': '0 1px 3px rgba(11, 37, 69, 0.06), 0 1px 2px rgba(11, 37, 69, 0.04)',
        'ficct-md': '0 4px 12px rgba(11, 37, 69, 0.08), 0 2px 4px rgba(11, 37, 69, 0.04)',
        'ficct-lg': '0 12px 28px rgba(11, 37, 69, 0.12), 0 4px 10px rgba(11, 37, 69, 0.06)',
        'ficct-green': '0 4px 14px rgba(76, 166, 75, 0.35)',
        'ficct-dark-glow': '0 0 25px rgba(76, 166, 75, 0.25)',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: [
          '"Plus Jakarta Sans"',
          "Georgia",
          "serif",
        ],
        display: [
          '"Space Grotesk"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

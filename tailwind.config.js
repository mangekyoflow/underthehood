/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#faf6f0',
          100: '#f4ebe0',
          200: '#e8dbcb',
          300: '#d6c2ab',
          400: '#b89d81',
          800: '#2c251f',
          900: '#1b1713',
          950: '#120f0d',
        },
        ink: {
          light: '#2d2824',
          muted: '#71665e',
          dark: '#f3efe8',
          darkMuted: '#a3988f',
        },
        background: '#09090B',
        surface: {
          DEFAULT: '#111114',
          subtle: '#141418',
          elevated: '#18181D',
          hover: '#222228',
        },
        border: {
          subtle: '#1E1E24',
          DEFAULT: '#27272A',
          strong: '#3F3F46',
        },
        network: {
          DEFAULT: '#06b6d4',
          light: '#38bdf8',
          dark: '#0e7490',
          glow: 'rgba(6, 182, 212, 0.25)',
        },
        database: {
          DEFAULT: '#8b5cf6',
          light: '#c084fc',
          dark: '#6d28d9',
          glow: 'rgba(139, 92, 246, 0.25)',
        },
        accent: {
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};

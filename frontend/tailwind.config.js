/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          base: '#090A0F',
          raised: '#0E1017',
          card: '#161922',
        },
        burnout: {
          low: '#10B981',
          moderate: '#F59E0B',
          critical: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 16px 40px -20px rgba(0,0,0,0.8)',
        glow: '0 0 20px rgba(99,102,241,0.25)',
        'glow-indigo': '0 0 20px rgba(99,102,241,0.25)',
        'glow-emerald': '0 0 15px rgba(16,185,129,0.15)',
        'glow-amber': '0 0 24px rgba(245,158,11,0.18)',
        'glow-rose': '0 0 18px rgba(239,68,68,0.20)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
        flip: 'cubic-bezier(0.4, 0.2, 0.2, 1)',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(320%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'ring-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0.9' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        sweep: 'sweep 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        shimmer: 'shimmer 1.6s linear infinite',
        'ring-pop': 'ring-pop 0.6s ease-out forwards',
        'pop-in': 'pop-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.label-mono': {
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        },
      });
    }),
  ],
};

// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          hi:   '#FFD700',
          mid:  '#D4AF37',
          lo:   '#B8860B',
          deep: '#8B6914',
        },
        bg: {
          primary:   '#0A0A0A',
          secondary: '#111111',
          card:      '#181818',
          card2:     '#1E1E1E',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans:  ['Montserrat', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'blink': 'blink 1.8s ease-in-out infinite',
        'fadeUp': 'fadeUp 0.7s ease forwards',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.25' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

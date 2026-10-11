import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0D0B08',
          2: '#141109',
          3: '#1C1710',
          4: '#242018',
        },
        ink: {
          DEFAULT: '#F5ECD7',
          2: 'rgba(245,236,215,0.55)',
          3: 'rgba(245,236,215,0.24)',
          4: 'rgba(245,236,215,0.08)',
        },
        gold: {
          DEFAULT: '#C8922A',
          dim: 'rgba(200,146,42,0.15)',
          bd: 'rgba(200,146,42,0.28)',
        },
        forest: {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
        },
        red: '#CE1126',
        border: 'rgba(245,236,215,0.07)',
        'border-2': 'rgba(245,236,215,0.12)',
      },
      fontFamily: {
        serif:   ['var(--font-cormorant)', 'serif'],
        display: ['var(--font-syne)',      'sans-serif'],
        mono:    ['var(--font-dm-mono)',   'monospace'],
        sans:    ['var(--font-inter)',     'sans-serif'],
      },
      borderRadius: {
        card:      '14px',
        'card-sm': '12px',
        'card-lg': '16px',
      },
      boxShadow: {
        card:        '0 20px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(200,146,42,0.28)',
        'card-soft': '0 16px 40px rgba(0,0,0,0.45)',
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        blink: {
          '0%,100%': { opacity: '1'    },
          '50%':     { opacity: '0.15' },
        },
        heroZoom: {
          from: { transform: 'scale(1.06)' },
          to:   { transform: 'scale(1.13)' },
        },
      },
      animation: {
        fadeSlideUp: 'fadeSlideUp 0.6s ease both',
        blink:       'blink 1.4s ease-in-out infinite',
        heroZoom:    'heroZoom 14s cubic-bezier(.25,.46,.45,.94) forwards',
      },
    },
  },
  plugins: [],
};

export default config;

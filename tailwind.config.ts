import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mushaf: {
          parchment: '#FAF8F2',
          surface: '#FFFDF9',
          border: '#E3DCB9',
          'border-ornate': '#D4AF37',
          gold: '#C29B38',
          'gold-light': '#F6EFCF',
          emerald: '#11654C',
          'emerald-light': '#E6F4EF',
          ink: '#15191E',
          'ink-muted': '#5D6672',
          ruby: '#9E2A2B',
        },
        darkMushaf: {
          bg: '#0B0F17',
          surface: '#131924',
          card: '#1A2232',
          border: '#273347',
          gold: '#E0BA53',
          emerald: '#1FA882',
          ink: '#F1F5F9',
          'ink-muted': '#94A3B8',
        },
        recall: {
          mastered: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          neutral: '#64748B',
        },
      },
      fontFamily: {
        uthmani: [
          'Amiri Quran',
          'UthmanicHafs',
          'KFGQPC Uthman Taha Naskh',
          'KFGQPC Uthmanic Script HAFS',
          'Scheherazade New',
          'Traditional Arabic',
          'serif',
        ],
        arabic: ['IBM Plex Sans Arabic', 'Readex Pro', 'Cairo', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        page: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        mushaf: '0 8px 30px rgba(194, 155, 56, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        hud: '0 20px 40px -15px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-bar': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

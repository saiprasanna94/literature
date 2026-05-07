/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0f5132',
          dark: '#0a3a25',
          light: '#1a6b46',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f1d77a',
        },
        teamA: {
          DEFAULT: '#2563eb',
          light: '#dbeafe',
          dark: '#1d4ed8',
        },
        teamB: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
          dark: '#b91c1c',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(250, 204, 21, 0.55)' },
          '70%': { boxShadow: '0 0 0 12px rgba(250, 204, 21, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(250, 204, 21, 0)' },
        },
        'trophy-bounce': {
          '0%, 100%': { transform: 'translateY(0) rotate(-4deg)' },
          '50%': { transform: 'translateY(-12px) rotate(4deg)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 250ms ease-out',
        'slide-down': 'slide-down 250ms ease-out',
        'scale-in': 'scale-in 180ms ease-out',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'trophy-bounce': 'trophy-bounce 1.4s ease-in-out infinite',
        confetti: 'confetti 3.5s ease-in forwards',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};

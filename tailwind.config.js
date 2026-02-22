/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 設計書デザインシステム
        navy: '#1E3A5F',
        accent: '#2E86C1',
        'light-blue': '#D6E4F0',
        'bg-gray': '#F5F5F5',
        'warn-orange': '#E67E22',
        'light-orange': '#FDEBD0',
        primary: {
          50: '#e8f4fd',
          100: '#d1e9fb',
          200: '#a3d3f7',
          300: '#6ab8f0',
          400: '#4a9fe6',
          500: '#2E86C1',
          600: '#2674a8',
          700: '#1E3A5F',
          800: '#162d4a',
          900: '#0e1f35',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Hiragino Sans"', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
        'chip': '20px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}

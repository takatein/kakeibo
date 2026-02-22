/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f4fd',
          100: '#d1e9fb',
          200: '#a3d3f7',
          300: '#6ab8f0',
          400: '#4a9fe6',
          500: '#2E86C1',    // 設計書 §11 アクセントカラー
          600: '#2674a8',
          700: '#1E3A5F',    // 設計書 §11 メインカラー
          800: '#162d4a',
          900: '#0e1f35',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Hiragino Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

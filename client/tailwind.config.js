/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Outfit"', 'Inter', 'sans-serif'],
        heading: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        lifedrop: {
          50: '#fff5f5',
          100: '#ffe3e3',
          200: '#ffc9c9',
          300: '#ffa3a3',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#c62828', // Brand primary crimson
          800: '#b71c1c',
          900: '#7f1d1d',
          950: '#450a0a',
          coral: '#ff5252',
          cream: '#fff8f8',
        },
        blood: {
          50: '#fef2f2',
          100: '#ffe1e1',
          200: '#ffc8c8',
          300: '#ffa2a2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#c62828',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      boxShadow: {
        'lifedrop': '0 12px 36px -4px rgba(198, 40, 40, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'lifedrop-lg': '0 20px 48px -6px rgba(198, 40, 40, 0.18), 0 8px 24px -4px rgba(0, 0, 0, 0.06)',
        'sos': '0 0 0 0 rgba(220, 38, 38, 0.7), 0 10px 25px -3px rgba(220, 38, 38, 0.5)',
      },
    },
  },
  plugins: [],
}

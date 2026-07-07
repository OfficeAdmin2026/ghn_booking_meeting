/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ghn-orange': '#FF6C0A',
        'ghn-orange-dark': '#CC5608',
        'ghn-orange-light': '#FFF7EC',
        'ghn-blue': '#1B5FAF',
        'ghn-blue-dark': '#144A8C',
        'ghn-blue-light': '#EBF3FF',
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
        heading: ['Exo', 'Be Vietnam Pro', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


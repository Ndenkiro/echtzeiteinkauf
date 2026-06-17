/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        red:    { DEFAULT: '#E30613', dark: '#B3000D', light: '#FDE8EA', lighter: '#FFF5F5' },
        orange: { DEFAULT: '#F7A800', dark: '#C07F00', light: '#FFF4D6' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}

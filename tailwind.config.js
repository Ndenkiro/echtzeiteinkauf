/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        red:    { DEFAULT: '#E30B6D', dark: '#B5085A', light: '#FCE5F0', lighter: '#FFF5FA' },
        orange: { DEFAULT: '#F7A800', dark: '#C07F00', light: '#FFF4D6' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}

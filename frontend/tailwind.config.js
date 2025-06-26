/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D32F2F',
        secondary: '#B71C1C',
        accent: '#1E88E5',
        neutral: '#333333',
        gray: {
          light: '#A6ACAF',
          medium: '#9CA3AF',
          dark: '#6B7280',
        },
        danger: '#EC4899',
        cardinal: '#D32F2F',
      },
      fontFamily: {
        sans: ['Spoqa Han Sans Neo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}; 
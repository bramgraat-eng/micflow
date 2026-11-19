/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#111827',
        panel: '#1F2937',
        accent: '#F97316',
        success: '#22C55E',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
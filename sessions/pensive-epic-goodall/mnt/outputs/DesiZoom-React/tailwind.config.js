/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#e07820',
          soft: '#fdf0e0',
          text: '#a05010',
        },
        pink: {
          soft: '#fde8f0',
          text: '#9a1545',
        },
        blue: {
          soft: '#e8eef8',
          text: '#2a4a8a',
        },
        navy: {
          DEFAULT: '#1c2340',
          dark: '#141928',
          light: '#242c4e',
        },
        surface: '#ffffff',
        muted: '#7a7e90',
        border: '#e2e4ee',
        green: { DEFAULT: '#2d7a52' },
      },
    },
  },
  plugins: [],
};

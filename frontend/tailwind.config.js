/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          50: '#FAF7F2',
          100: '#F0EBE3',
          200: '#E0D5C7',
          300: '#C9B89E',
          400: '#B49A7D',
          500: '#A0855C',
          600: '#8B6F4E',
          700: '#725A3A',
          800: '#5C4633',
          900: '#3D2E1F',
        },
        'theme-bg': '#FAF7F2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

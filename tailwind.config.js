/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f2f8f0",
          100: "#e1efdb",
          200: "#c3ddb8",
          300: "#9dc78c",
          400: "#78ad64",
          500: "#5a9147",
          600: "#457436",
          700: "#375c2c",
          800: "#2f4a26",
          900: "#293e21",
        },
        clay: {
          50: "#fbf6f1",
          100: "#f2e5d8",
          200: "#e4c9ae",
          300: "#d3a87c",
          400: "#c4884f",
          500: "#a86b39",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Noto Sans TC", "sans-serif"],
      },
    },
  },
  plugins: [],
};

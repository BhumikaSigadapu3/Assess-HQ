/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#6D28D9",
          600: "#5B21B6"
        }
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      colors: { rust: "#A8431E", sage: "#5B6B4F", sand: "#FAF7F1", ink: "#111110" },
    },
  },
  plugins: [],
};

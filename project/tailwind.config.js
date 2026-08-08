/**
 * @type {import('tailwindcss').Config}
 *
 * NOT LOADED. Tailwind v4 is CSS-first — this file only takes effect if
 * referenced from CSS via `@config "../tailwind.config.js";`, which nothing
 * in this project does. The theme below (fontFamily, primary/secondary/accent)
 * is already duplicated in the `@theme` block in app/globals.css, which is
 * what actually runs. Edit tokens there, not here. Kept only because deleting
 * it isn't necessary to fix anything — happy to remove it if it's dead weight.
 */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        grotesk: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: "#4493b8",
        secondary: "#53CBF3",
        accent: "#FFDE42",
      },
    },
  },
  plugins: [],
}

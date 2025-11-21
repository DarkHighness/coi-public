/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "rgb(var(--theme-bg-rgb) / <alpha-value>)",
          surface: "rgb(var(--theme-surface-rgb) / <alpha-value>)",
          "surface-highlight": "rgb(var(--theme-surface-highlight-rgb) / <alpha-value>)",
          border: "rgb(var(--theme-border-rgb) / <alpha-value>)",
          primary: "rgb(var(--theme-primary-rgb) / <alpha-value>)",
          "primary-hover": "rgb(var(--theme-primary-hover-rgb) / <alpha-value>)",
          text: "rgb(var(--theme-text-rgb) / <alpha-value>)",
          muted: "rgb(var(--theme-muted-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        fantasy: ["Cinzel", "serif"],
        scifi: ["Orbitron", "sans-serif"],
        horror: ["Creepster", "cursive"],
        cyberpunk: ["Rajdhani", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out",
        "fade-in-up": "fadeInUp 0.8s ease-out",
        "slide-in": "slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(30px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

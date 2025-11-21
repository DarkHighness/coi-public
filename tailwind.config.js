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
          bg: "var(--theme-bg)",
          surface: "var(--theme-surface)",
          "surface-highlight": "var(--theme-surface-highlight)",
          border: "var(--theme-border)",
          primary: "var(--theme-primary)",
          "primary-hover": "var(--theme-primary-hover)",
          text: "var(--theme-text)",
          muted: "var(--theme-muted)",
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

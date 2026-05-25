/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wastelink: {
          primary: "#238636",
          secondary: "#2F9E44",
          dark: "#111111",
          muted: "#6B7280",
          border: "#D9D9D9",
          background: "#F8F9FA",
          surface: "#FFFFFF",
          success: "#EAF6EA",
        },
      },
      fontFamily: {
        sans: ["Orbitron", "sans-serif"],
        orbitron: ["Orbitron", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      backgroundColor: {
        default: "#F8F9FA",
      },
      borderColor: {
        default: "#D9D9D9",
      },
    },
  },
  plugins: [],
};

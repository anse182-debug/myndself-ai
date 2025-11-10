/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // palette "dark zen"
        "ms-bg": "#0d1117",
        "ms-surface": "rgba(255,255,255,0.03)",
        "ms-border": "rgba(255,255,255,0.08)",
        "ms-mint": "#10b981",
        "ms-mint-soft": "rgba(16,185,129,0.15)",
        "ms-teal": "#14b8a6",
      },
      backgroundImage: {
        "ms-gradient":
          "radial-gradient(circle at top, rgba(20,184,166,0.35), rgba(13,17,23,1) 55%)",
      },
      borderRadius: {
        "2.5xl": "1.35rem",
      },
      boxShadow: {
        "ms-glow": "0 20px 45px rgba(20,184,166,0.25)",
      },
      animation: {
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.4 },
        },
      },
    },
  },
  plugins: [],
}

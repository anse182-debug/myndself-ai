// frontend/src/config.ts

// Base URL del backend.
// In produzione viene letto da VITE_API_BASE (configurato su Vercel).
// In locale, se la variabile non è presente, usa il backend su Render come fallback.

export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://myndself-ai.onrender.com"

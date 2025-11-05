# MyndSelf.ai — AI for Emotional Intelligence

Dark-Zen web stack + pitch deck tooling.

## Monorepo
- `frontend/`: React + Vite + Tailwind + Framer Motion (landing EN)
- `backend/`: Fastify mock API (OpenAPI 3.1)
- `build-myndself-deck.ps1`: genera PPTX + template + PDF (se PowerPoint installato)

## Requisiti
- Node.js 18+ (consigliato 20)
- npm o pnpm
- (Opzionale) Docker Desktop
- (Opzionale) Microsoft PowerPoint (per export PDF automatico via COM)

## Avvio rapido (locale)
1. Posiziona le immagini in `frontend/public/images/`:
   - `cover_glow.(webp|png)`
   - `chatbot_mockup.(webp|png)`
   - `empathic_engine.(webp|png)`
   - `market_growth.(webp|png)`
   - `vision_glow.(webp|png)`
2. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev

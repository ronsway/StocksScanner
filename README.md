# GS AI Stock Screener (React)

This project is now a full React + Vite application with a local Node API server for report generation.

## What Changed

- Migrated the original single-file HTML app into a React app in `src/App.jsx`.
- Preserved the original visual design and report rendering flow.
- Moved AI requests behind a server endpoint so API keys are not exposed in the browser.
- Added Vite proxying from `/api/*` to the local server.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Add your Anthropic API key to `.env`:

```env
ANTHROPIC_API_KEY=your_real_key_here
```

## Run

Start both frontend and backend together:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API server: http://localhost:8787

## Scripts

- `npm run dev`: Runs frontend and backend together
- `npm run dev:client`: Runs only Vite frontend
- `npm run dev:server`: Runs only API server
- `npm run build`: Builds frontend for production
- `npm run preview`: Previews built frontend
- `npm run lint`: Runs ESLint

## API Endpoint

- `POST /api/research-report`
- Request body expects `{ prompt, sector, profile }`
- Response includes parsed `report` when valid JSON is returned by the model, plus raw model text.

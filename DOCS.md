# StocksScanner — Full Technical Documentation

> Last updated: May 2026  
> Stack: React 19 · Vite · Express 5 · Node.js · Yahoo Finance API · Anthropic / OpenAI

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Architecture](#3-architecture)
4. [Environment Setup](#4-environment-setup)
5. [Running the App](#5-running-the-app)
6. [npm Scripts Reference](#6-npm-scripts-reference)
7. [Shell & Batch Script Reference](#7-shell--batch-script-reference)
8. [Frontend — `src/App.jsx`](#8-frontend--srcappjsx)
9. [Styling & Theming — `src/App.css`](#9-styling--theming--srcappcss)
10. [Backend — `server/index.js`](#10-backend--serverindexjs)
11. [API Reference](#11-api-reference)
12. [AI Prompt System](#12-ai-prompt-system)
13. [Live Market Data — Yahoo Finance](#13-live-market-data--yahoo-finance)
14. [Report Caching & History](#14-report-caching--history)
15. [PDF Export](#15-pdf-export)
16. [Security Practices](#16-security-practices)
17. [Deployment](#17-deployment)
18. [Codebase Conventions](#18-codebase-conventions)
19. [Known Limitations](#19-known-limitations)
20. [Changelog (key milestones)](#20-changelog-key-milestones)

---

## 1. Project Overview

StocksScanner is a single-page React application that generates **institutional-grade equity research reports** on demand, backed by a local Express API server. The user selects a market sector and investment profile; the server sends a structured prompt to an AI model (Claude or GPT), parses the JSON response, enriches it with live Yahoo Finance price data, and returns a fully rendered research report — complete with macro context, stock deep-dives, price targets, bull/bear cases, entry zones, stop losses, and Wall Street consensus data.

**Core capabilities:**

- AI-generated reports for 12 sectors with 10 stock picks each (or a single-ticker deep-dive)
- Live price enrichment via Yahoo Finance (quote API + chart API fallback)
- Price target and entry zone reconciliation against live prices
- 5-minute in-browser report caching with full history panel
- 6 UI themes switchable without page reload
- PDF export via hidden iframe (no blank tab, full orientation/zoom control)
- WhatsApp share
- Dual AI provider support: Anthropic Claude + any OpenAI-compatible endpoint

---

## 2. Repository Structure

```
StocksScanner/
├── src/
│   ├── App.jsx          # Entire frontend: constants, data, logic, JSX
│   └── App.css          # All styles + CSS custom properties + 6 themes + print styles
├── server/
│   └── index.js         # Express API: AI calls, Yahoo Finance, price reconciliation
├── scripts/
│   ├── start_dev.bat    # Windows: start frontend + backend in background
│   ├── stop_dev.bat     # Windows: stop development processes
│   ├── start_deploy.bat # Windows: build + start production server
│   ├── stop_deploy.bat  # Windows: stop production server
│   ├── start_dev.sh     # Linux/macOS equivalents
│   ├── stop_dev.sh
│   ├── start_deploy.sh
│   └── stop_deploy.sh
├── public/              # Static assets served by Vite
├── .run/                # PID files for background processes (git-ignored)
├── logs/                # Log output from background scripts (git-ignored)
├── .env                 # Local secrets — never commit this
├── .env.example         # Template for .env
├── .gitignore
├── eslint.config.js
├── index.html           # Vite HTML entry point
├── vite.config.js       # Vite config with /api proxy to port 8787
├── package.json
├── README.md            # Quick-start guide
└── DOCS.md              # This file
```

---

## 3. Architecture

```
Browser (React SPA)
│
│  /api/* proxied by Vite dev server
│  (direct in production — same Express server serves /dist)
▼
Express API Server  (port 8787)
│
├── POST /api/research-report
│     │
│     ├── buildPrompt() → AI provider
│     │     ├── Anthropic Claude  (claude-sonnet-4-20250514, with model fallback chain)
│     │     └── OpenAI-compatible (gpt-4.1-mini default, configurable)
│     │
│     ├── Parse JSON response from model
│     │
│     └── enrichReportWithLiveMarketData()
│           ├── fetchYahooQuotes(stockTickers)   → Yahoo Finance /v7/finance/quote
│           ├── fetchYahooQuotes(benchmarkTickers) → SPY, QQQ, ^VIX, ^TNX
│           └── reconcileTargetsWithLivePrice()  → rescale price targets & entry zones
│
└── GET /api/health
```

**Data flow summary:**

1. User picks sector + profile → clicks Generate
2. `buildPrompt()` constructs a structured prompt with sector, profile, and strict JSON schema
3. Frontend POSTs `{ prompt, sector, profile, aiProvider, ticker }` to `/api/research-report`
4. Server sends prompt + system prompt to AI provider
5. Server parses the AI JSON response
6. Server fetches live prices from Yahoo Finance for all tickers + SPY/QQQ/VIX/TNX
7. Server reconciles model price targets against live prices
8. Server returns enriched report JSON to frontend
9. Frontend renders the report as HTML via `renderReportHtml()` and stores it in history

---

## 4. Environment Setup

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

**All environment variables:**

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | No | `anthropic` | Default provider when client sends `aiProvider=auto`. Accepts `anthropic` or `openai`. |
| `ANTHROPIC_API_KEY` | If using Claude | — | Your Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-20250514` | Anthropic model ID. Server tries this first, then falls back through a hardcoded chain of claude models. |
| `OPENAI_API_KEY` | If using OpenAI/other | — | API key for OpenAI or any compatible provider |
| `OPENAI_MODEL` | No | `gpt-4.1-mini` | Model name for the OpenAI-compatible endpoint |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | Base URL — point this at OpenRouter, Groq, Together, etc. |
| `PORT` | No | `8787` | Port the Express server listens on |
| `NODE_ENV` | No | unset | Set to `production` to serve the built React app from `/dist` |

**Using OpenRouter / Groq / Together:**

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-or-xxxx
OPENAI_MODEL=anthropic/claude-3.5-sonnet
OPENAI_BASE_URL=https://openrouter.ai/api/v1
```

---

## 5. Running the App

**Development (both frontend + backend together):**

```bash
npm run dev
```

- Frontend (Vite): <http://localhost:5173>
- API server: <http://localhost:8787>
- All `/api/*` requests from the frontend are proxied by Vite to the API server

**Production:**

```bash
npm run build
NODE_ENV=production node server/index.js
```

The Express server serves the built React app from `/dist` and handles all `/api/*` routes on the same port.

---

## 6. npm Scripts Reference

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `concurrently "npm:dev:server" "npm:dev:client"` | Start frontend + backend together |
| `npm run dev:client` | `vite` | Start only the Vite frontend |
| `npm run dev:server` | `node server/index.js` | Start only the API server |
| `npm run build` | `vite build` | Build frontend to `/dist` |
| `npm run preview` | `vite preview` | Preview the production build locally |
| `npm run lint` | `eslint .` | Run ESLint across all files |
| `npm run server` | `node server/index.js` | Alias for dev:server |

---

## 7. Shell & Batch Script Reference

All scripts live in `/scripts/`. They run from the **project root** regardless of where you call them from.

### `start_dev` (Windows: `.bat`, Unix: `.sh`)

1. Creates `.run/` and `logs/` directories if missing
2. Installs npm dependencies if `node_modules/` is absent
3. Checks if already running (reads PID from `.run/dev.pid`), exits early if so
4. Launches `npm run dev` as a background process
5. Writes the process PID to `.run/dev.pid`
6. Logs all output to `logs/dev.log`

### `stop_dev`

Reads `.run/dev.pid`, kills the process, removes the PID file.

### `start_deploy`

1. Runs `npm ci` (or `npm install` if no lockfile)
2. Runs `npm run build`
3. Starts `node server/index.js` with `NODE_ENV=production`
4. Writes PID to `.run/deploy.pid`, logs to `logs/deploy.log`

### `stop_deploy`

Reads `.run/deploy.pid`, kills the process, removes the PID file.

---

## 8. Frontend — `src/App.jsx`

Single-file React component. No routing library — one page, one component, multiple conditional sections.

### Key Constants

```js
SECTORS          // 12 sectors with id, name, icon, desc, color, sample tickers
DEFAULT_PROFILE  // { risk: 'Moderate', horizon: '2 years', strategy: 'Growth', cap: 'Large Cap' }
CONFIG_OPTIONS   // All selectable values per profile dimension
LOADING_STEPS    // 5-step loading animation labels
THEMES           // 6 UI themes (id, label, swatch hex)
API_PROVIDER_OPTIONS  // auto / anthropic / openai

// Storage keys (localStorage)
REPORT_HISTORY_STORAGE_KEY = 'stocks-scanner-report-history-v1'
API_PROVIDER_STORAGE_KEY   = 'stocks-scanner-api-provider-v1'
THEME_STORAGE_KEY          = 'stocks-scanner-theme-v1'

REPORT_CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes
MAX_HISTORY_ITEMS   = 20
```

### Available Sectors

| ID | Name | Sample Tickers |
|---|---|---|
| `technology` | Technology | NVDA, MSFT, META, GOOGL, PLTR |
| `energy` | Energy | XOM, CVX, COP, LNG, NEE |
| `healthcare` | Healthcare | LLY, UNH, ISRG, ABBV, JNJ |
| `financials` | Financials | JPM, GS, BRK.B, V, PYPL |
| `consumer` | Consumer | AMZN, TSLA, MCD, LVMH, SBUX |
| `industrials` | Industrials | RTX, HON, GE, UPS, CAT |
| `realestate` | Real Estate | PLD, EQIX, AMT, SPG, O |
| `materials` | Materials | BHP, FCX, LIN, NEM, ALB |
| `utilities` | Utilities | NEE, DUK, SO, AWK, CEG |
| `crypto` | Crypto / Web3 | COIN, MSTR, MARA, RIOT, HOOD |
| `defense` | Defense & Space | LMT, NOC, RTX, SPCE, KTOS |
| `ai` | AI & Robotics | NVDA, MSFT, PLTR, TSLA, AI |

### State

| State | Type | Persisted | Purpose |
|---|---|---|---|
| `selectedSector` | object \| null | No | Currently selected sector object |
| `specificTicker` | string | No | Optional single-ticker mode input |
| `aiProvider` | string | localStorage | Selected AI provider (`auto`/`anthropic`/`openai`) |
| `profile` | object | No | Investment profile (risk, horizon, strategy, cap) |
| `isGenerating` | boolean | No | Whether an API call is in flight |
| `showReport` | boolean | No | Whether the report section is visible |
| `loadingStep` | number | No | Current loading animation step (0–4) |
| `reportHtml` | string | No | Rendered HTML string of the current report |
| `reportData` | object \| null | No | Raw parsed JSON report from the API |
| `reportHistory` | array | localStorage | Up to 20 past report entries |
| `historyNowTs` | number | No | Timestamp used to compute relative ages in history |
| `cacheNotice` | string | No | Message shown when a cached report is loaded |
| `theme` | string | localStorage | Active UI theme id |

### Key Functions

#### `buildRequestKey(sector, profile, specificTicker, aiProvider)`

Produces a deterministic JSON string key from the request parameters. Used to match incoming requests against cached history entries.

#### `buildPrompt(sector, profile, specificTicker)`

Constructs the full user-facing prompt sent to the AI. Includes sector, investment profile, and the complete required JSON schema. In single-ticker mode, instructs the AI to generate exactly 1 stock.

#### `renderReportHtml(data, profile)`

Takes the parsed AI JSON and `profile` and returns a fully self-contained HTML string. This string is set as `innerHTML` of the report section. All values are run through `sanitizeForHtml()` to prevent XSS. The function renders:

- Report header (sector, date, profile metadata)
- Live market snapshot (SPY, QQQ, VIX, TNX)
- Macro indicator strip
- Executive summary table
- Per-stock deep-dive cards (metrics, revenue trend, price target bar, bull/bear cases, entry zone, consensus bar, risk meter)
- Disclaimer

#### `sanitizeForHtml(value)` / `escapeHtml(value)`

Recursively escapes all string values in the report data before they are injected into the HTML string. Prevents any script injection from AI-generated content.

#### `generateReport()`

Main async function:

1. Checks cache — loads from history if a matching non-expired entry exists
2. Sets loading state, fires the API request
3. Parses the response (JSON directly from `report` field, or extracted from raw text)
4. Saves to history, renders the report

#### `loadHistoryEntry(entry)` / `saveHistoryEntry(entry)` / `persistHistory(items)`

History management. `persistHistory` writes to both React state and localStorage atomically.

#### `exportReportPdf()`

Creates a hidden `<iframe>` off-screen, writes the full report HTML + inlined light-mode CSS overrides + `@page { size: auto }` into it, and calls `iframe.contentWindow.print()` on load. The iframe removes itself after the print dialog is closed (`afterprint` event). No blank tab is opened.

#### `shareOnWhatsApp()`

Builds a plain-text summary string and opens `https://wa.me/?text=...` in a new tab.

---

## 9. Styling & Theming — `src/App.css`

All colors are CSS custom properties on `:root`. No hardcoded colors outside of `@media print` overrides and the theme-specific override blocks.

### CSS Custom Properties (default theme)

```css
:root {
  --ink:    #0a0c12;   /* Page background */
  --ink2:   #111520;   /* Card backgrounds */
  --gold:   #c9963a;   /* Primary accent */
  --gold2:  #e8b84a;   /* Secondary accent */
  --gold3:  #f5d070;   /* Tertiary accent / highlights */
  --silver: #7a8ea8;   /* Muted text, labels */
  --cream:  #e8dcc8;   /* Light warm accent */
  --border: rgba(201,150,58,0.2);   /* Card borders */
  --border2: rgba(201,150,58,0.08); /* Subtle borders */
  --text:   #c8d0dc;   /* Body text */
  --text2:  #7a8ea8;   /* Secondary text */
  --green:  #2ecc8a;   /* Positive / Buy */
  --red:    #e05060;   /* Negative / Sell */
  --blue:   #4a9fd4;   /* Info / Buy badge */
  --purple: #a070d8;   /* Supplementary */
  --orange: #e07a30;   /* Warning */
  --teal:   #30c4b0;   /* Supplementary */
  --r:      4px;       /* Base border-radius */
}
```

### Themes

Themes are applied by setting `data-theme` on `<html>`. The default theme has no `data-theme` attribute.

| Theme ID | `data-theme` value | Character |
|---|---|---|
| `default` | *(none)* | Goldman Sachs dark gold |
| `bloomberg` | `bloomberg` | Black terminal, amber, monospace font |
| `paper` | `paper` | Warm white, ink-brown, newspaper feel |
| `cyber` | `cyber` | Near-black, cyan/magenta neon glows |
| `forest` | `forest` | Dark green, leaf accents, ESG palette |
| `hc` | `hc` | Pure black + yellow, maximum contrast |

Each theme block overrides the full set of `--ink`, `--gold`, `--text`, `--green`, `--red` etc. variables and also patches specific elements (`.header`, `.bg-glow-1`, `.bg-glow-2`, `.hero-title`, `.rpt-title`, `.generate-btn`) that use hardcoded colors.

### Print Styles

The `@media print` block at the bottom of App.css handles direct browser printing (if someone uses `Ctrl+P` while the app is open). For the PDF export button, the print CSS is inlined into the iframe and overridden with a light-mode `:root` variable block. Key rules:

- `@page { margin: 15mm }` — no forced orientation; user controls it in the print dialog
- Hide all UI chrome (header, hero, config, history, generate sections)
- Force white backgrounds and dark text on all report elements
- `overflow: visible` on `.summary-wrap` and `.table-scroll` so the full table prints
- `break-inside: avoid` on `.scard` and `.rpt-header` to prevent mid-card page breaks
- `.cards-grid { grid-template-columns: 1fr 1fr }` — 2-column card layout for print

---

## 10. Backend — `server/index.js`

Pure ES module (`"type": "module"` in `package.json`). No TypeScript. No ORM.

### Module-level Configuration

All configuration is read from `process.env` at startup:

```js
port            = process.env.PORT || 8787
defaultAiProvider = process.env.AI_PROVIDER || 'anthropic'
anthropicApiKey = process.env.ANTHROPIC_API_KEY
anthropicModel  = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
openAiApiKey    = process.env.OPENAI_API_KEY
openAiModel     = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
openAiBaseUrl   = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
isProduction    = process.env.NODE_ENV === 'production'
```

### System Prompt

```
You are a senior equity analyst at Goldman Sachs with 20 years of experience.
You produce detailed, professional equity research screening reports in strict JSON format.
You respond ONLY with a valid JSON object - no preamble, no markdown, no backticks.
The JSON must be complete and parseable.
```

This is sent as the `system` field (Anthropic) or `{ role: 'system' }` message (OpenAI).

### `requestAnthropic(prompt)`

- Tries models in order: configured model → `claude-sonnet-4-20250514` → `claude-3-7-sonnet-latest` → `claude-3-5-sonnet-latest`
- Stops retrying if the failure is not a model-not-found error
- Returns `{ ok, status, raw, content, provider, modelUsed }` or `{ ok: false, error, ... }`

### `requestOpenAiCompatible(prompt)`

- Single request to `${openAiBaseUrl}/chat/completions`
- Temperature: `0.2` for consistent structured output
- Returns same shape as `requestAnthropic`

### Provider Selection Logic

```
aiProvider from client → normalizeProviderName()
                           ↓
if 'openai'  → requestOpenAiCompatible()
if 'anthropic' → requestAnthropic()
               → if credit error AND openAiApiKey present → fallback to requestOpenAiCompatible()
if 'auto'    → requestAnthropic()
               → if any error AND openAiApiKey present → fallback to requestOpenAiCompatible()
```

### `normalizeProviderName(value)`

Maps loose provider strings to canonical values:

- `'anthropic'` or `'claude'` → `'anthropic'`
- `'openai'`, `'chatgpt'`, `'other'`, `'custom'`, `'openai-compatible'` → `'openai'`
- `'auto'` → `'auto'`
- Anything else → `null` (triggers 400 error)

---

## 11. API Reference

### `GET /api/health`

Returns server status and available providers.

**Response:**

```json
{
  "ok": true,
  "defaultProvider": "anthropic",
  "providers": ["auto", "anthropic", "openai"]
}
```

---

### `POST /api/research-report`

Generates an AI equity research report, enriched with live market data.

**Request body:**

```json
{
  "prompt": "string — full prompt built by buildPrompt() on the client",
  "sector": "string — sector id (e.g. 'technology')",
  "profile": {
    "risk": "Moderate",
    "horizon": "2 years",
    "strategy": "Growth",
    "cap": "Large Cap"
  },
  "aiProvider": "auto | anthropic | openai",
  "ticker": "NVDA"
}
```

- `prompt` takes precedence. If omitted, a basic prompt is synthesized from `sector` + `profile`.
- `ticker` is informational; the single-ticker instruction is embedded in the prompt by the client.

**Response (success):**

```json
{
  "report": { /* enriched report object — see AI JSON Schema below */ },
  "raw": "raw model text",
  "content": [{ "type": "text", "text": "..." }],
  "providerUsed": "anthropic",
  "modelUsed": "claude-sonnet-4-20250514"
}
```

**Response (error):**

```json
{
  "error": "Human-readable error message",
  "provider": "anthropic",
  "modelTried": "claude-sonnet-4-20250514"
}
```

**Status codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Missing prompt or invalid `aiProvider` |
| 500 | Server misconfiguration (missing API key) or unexpected error |
| 502 | Upstream AI provider returned an error |

---

## 12. AI Prompt System

### Prompt Structure

`buildPrompt(sector, profile, specificTicker)` in `App.jsx` generates:

```
You are a senior Goldman Sachs equity analyst. Generate a comprehensive
[single-stock report centered on {TICKER} within | stock screening report for]
the {SECTOR} sector.

Investment profile:
- Risk tolerance: {risk}
- Horizon: {horizon}
- Strategy: {strategy}
- Market cap focus: {cap}

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks):
{ ... full schema ... }

Requirements:
- Generate exactly [1 | 10] stocks
- Use real, well-known ticker data
- All numbers should be realistic and grounded in current market data as of early 2026
...
```

### Required AI JSON Schema

The AI must return exactly this structure. All fields are required:

```json
{
  "sectorName": "string",
  "sectorTheme": "string — one-sentence 2026 investment thesis",
  "macro": [
    {
      "label": "string",
      "value": "string",
      "change": "string",
      "direction": "up | down | neutral"
    }
    // × 5 items
  ],
  "stocks": [
    {
      "ticker": "string",
      "company": "string",
      "subsector": "string",
      "rating": "STRONG BUY | BUY | HOLD",
      "pe": "string — e.g. '~32 x fwd'",
      "sectorAvgPe": "string",
      "revGrowth": "string — e.g. '+22%'",
      "revGrowthPositive": "boolean",
      "revBars": [0-100, 0-100, 0-100, 0-100, 0-100],
      "de": "string",
      "deNote": "string",
      "divYield": "string",
      "divNote": "string",
      "moat": "Strong | Moderate | Weak",
      "bullTarget": "$XXX",
      "bearTarget": "$XXX",
      "currentPrice": "$XXX",
      "bullPct": 0-100,
      "bearPct": 0-100,
      "currentPct": 0-100,
      "bullCase": "string",
      "bearCase": "string",
      "entryLow": "$XXX",
      "entryHigh": "$XXX",
      "stopLoss": "$XXX",
      "risk": 1-10,
      "riskNote": "string",
      "buyPct": 0-100,
      "holdPct": 0-100,
      "sellPct": 0-100,
      "analystNote": "string",
      "catalysts": ["string", "string", "string", "string"]
    }
    // × 10 (or × 1 in single-ticker mode)
  ],
  "disclaimer": "string"
}
```

**Constraints enforced in the prompt:**

- `buyPct + holdPct + sellPct` must sum to 100
- `bearPct < currentPct < bullPct`
- `revBars` is a 5-element array of 0–100 values (2021–2025 relative revenue trend)
- `risk` is an integer 1–10

---

## 13. Live Market Data — Yahoo Finance

### `fetchYahooQuotes(tickers)`

Fetches real-time quotes for an array of ticker symbols.

**Primary endpoint:**

```
https://query1.finance.yahoo.com/v7/finance/quote?symbols={comma-separated}
```

**Fallback (per-symbol, for any missing from the primary):**

```
https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d
```

**Per-quote data collected:**

- `price` — `regularMarketPrice`
- `changePct` — `regularMarketChangePercent`
- `change` — `regularMarketChange`
- `currency`
- `asOf` — ISO timestamp from `regularMarketTime`
- `marketState` — e.g. `REGULAR`, `PRE`, `POST`

**Ticker normalisation:** `.` → `-` (e.g. `BRK.B` → `BRK-B` for Yahoo)

### Benchmark Tickers

Always fetched alongside stock tickers:

- `SPY` — S&P 500 ETF
- `QQQ` — Nasdaq 100 ETF
- `^VIX` — CBOE Volatility Index
- `^TNX` — 10-Year Treasury Yield

These appear in the **Live Market Snapshot** strip at the top of every report.

### `reconcileTargetsWithLivePrice(stock, livePrice)`

The AI generates price targets based on training data (potentially stale). This function adjusts them to the live price:

1. **If model prices are coherent** (`bear < current < bull`): scale bull and bear targets by `livePrice / modelCurrentPrice`, preserving the same upside/downside ratios. Entry zone and stop loss are also scaled by the same ratio.

2. **If model prices are incoherent** (or missing): generate fallback targets from rating:
   - STRONG BUY: bull = live × 1.30, bear = live × 0.85
   - BUY: bull = live × 1.20, bear = live × 0.88
   - HOLD: bull = live × 1.12, bear = live × 0.90

3. Always overwrites `currentPrice` with the live price.

---

## 14. Report Caching & History

### Cache Key

```js
buildRequestKey(sector, profile, specificTicker, aiProvider)
// → JSON string of { sectorId, profile: { risk, horizon, strategy, cap }, aiProvider, ticker }
```

Two requests with the same sector, profile, ticker, and provider produce the same key.

### Cache TTL

5 minutes (`REPORT_CACHE_TTL_MS = 5 * 60 * 1000`). If a matching history entry is found that is less than 5 minutes old, it is loaded directly without an API call. A `cacheNotice` message is shown to the user.

### History Storage

- Key: `stocks-scanner-report-history-v1` in `localStorage`
- Format: JSON array of history entry objects
- Max entries: 20 (`MAX_HISTORY_ITEMS`). Oldest entries are dropped when the limit is exceeded.
- Same-key entries are deduplicated (only the newest is kept)

### History Entry Shape

```json
{
  "id": "1746200000000-abc123",
  "requestKey": "...",
  "createdAt": 1746200000000,
  "sectorId": "technology",
  "sectorName": "Technology",
  "specificTicker": "",
  "aiProvider": "anthropic",
  "profile": { "risk": "Moderate", "horizon": "2 years", "strategy": "Growth", "cap": "Large Cap" },
  "report": { /* full enriched report JSON */ }
}
```

---

## 15. PDF Export

Triggered by the **Export PDF** button in the report actions bar.

### Approach: Hidden Iframe

```
exportReportPdf()
  │
  ├── Collect all CSS rules from document.styleSheets (catches Vite-injected styles)
  │
  ├── Create <iframe> positioned at top:-9999px (invisible, off-screen)
  │
  ├── Write into iframe:
  │     - All collected CSS (so all class styles are available)
  │     - @page { size: auto; margin: 15mm } — lets user choose orientation/zoom
  │     - Light-mode :root override (--ink: #fff, --text: #111, etc.)
  │     - Display:none for all UI chrome
  │     - overflow: visible on summary-wrap / table-scroll
  │     - break-inside: avoid on .scard
  │     - Light-mode color overrides for badges, tickers, pos/neg colors
  │     - The reportHtml string
  │
  ├── On iframe load: call iframe.contentWindow.print()
  │
  └── On afterprint: remove iframe from DOM
```

**Why iframe over `window.open`:** A new tab (even `window.open('', '_blank')`) appears briefly as a blank page before being filled. A hidden iframe is never visible to the user.

**Why no forced `size: A4 landscape`:** The `@page size` rule locks the print dialog's orientation dropdown to the specified value, preventing the user from changing it. `size: auto` defers to the OS print dialog defaults, giving full control.

---

## 16. Security Practices

### XSS Prevention

All AI-generated text is processed through `sanitizeForHtml()` before being injected into the report HTML string. This function recursively calls `escapeHtml()` on every string value in the report object, escaping `&`, `<`, `>`, `"`, and `'`. No raw AI output reaches the DOM unescaped.

### API Key Protection

API keys live in `.env` (server-side only) and are never sent to the browser. The Vite proxy (`/api/*` → `http://localhost:8787`) means the browser only ever talks to `localhost`; it never holds or sends provider credentials.

### Input Validation

- `aiProvider` is validated through `normalizeProviderName()` — any unrecognised value returns a 400
- `prompt` is trimmed and length-limited by `express.json({ limit: '1mb' })`
- Ticker symbols on the client are filtered to `[A-Z0-9.-]` only before being sent

### No Eval / No Dynamic Code

No `eval()`, `Function()`, or `innerHTML` on user-supplied raw strings. The only `innerHTML` usage is in the report section, and the content has been fully sanitized.

---

## 17. Deployment

### Production Build

```bash
npm run build          # outputs to /dist
NODE_ENV=production node server/index.js
```

Express serves `/dist` as static files and handles `/api/*` routes. All non-API GET routes serve `index.html` for client-side routing.

### Using the Deploy Script (Windows)

```bat
scripts\start_deploy.bat
```

This runs `npm ci` → `npm run build` → starts the server in the background with `NODE_ENV=production`. Server PID is saved to `.run/deploy.pid`. Logs go to `logs/deploy.log`.

### Port Configuration

Default port is `8787`. Override with the `PORT` environment variable:

```env
PORT=3000
```

### Reverse Proxy (nginx example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 18. Codebase Conventions

- **ES Modules throughout** — both frontend (`import/export`) and backend (`"type": "module"`)
- **No TypeScript** — plain JavaScript with JSDoc-style variable names
- **Single-file frontend** — all logic in `App.jsx`, all styles in `App.css`. No component splitting.
- **No external UI libraries** — everything is custom HTML + CSS
- **Functional React only** — no class components; hooks only (`useState`, `useEffect`, `useMemo`, `useRef`)
- **All colors via CSS variables** — never hardcode a hex in JSX inline styles for themed values
- **All AI output sanitized** — never inject raw model text into the DOM
- **localStorage wrapped in try/catch** — privacy mode or quota errors are silently swallowed
- **Server functions are pure** — `requestAnthropic`, `requestOpenAiCompatible`, `enrichReportWithLiveMarketData` take inputs and return outputs with no side effects
- **Errors surface as human-readable messages** — never expose stack traces or raw error objects to the browser

---

## 19. Known Limitations

| Limitation | Detail |
|---|---|
| No authentication | The API server has no auth. Do not expose port 8787 directly to the internet in production — always put it behind a reverse proxy. |
| Yahoo Finance rate limits | No official API key required, but heavy use may result in temporary IP blocks. The app has no retry logic for Yahoo Finance failures — stocks with failed lookups simply keep their AI-generated prices. |
| AI JSON reliability | Occasionally the model returns malformed JSON. The server attempts a regex-based JSON extraction as a fallback. If that also fails, the frontend shows an error message. |
| localStorage size | Very large reports (10 stocks × full deep-dives) can approach 100–200 KB per entry. At 20 history items this is 2–4 MB, close to the typical 5 MB localStorage quota. |
| No real-time streaming | Reports are fetched as a single response. No streaming or SSE. Users see a stepped loading animation during the request. |
| Single-page, no URL state | Sector, profile, and report state are not reflected in the URL. Deep-linking to a specific report is not possible. |

---

## 20. Changelog (key milestones)

| Date | Change |
|---|---|
| Initial | Migrated original single-file HTML app into React + Vite + Express architecture |
| Early 2026 | AI provider selection added (Anthropic / OpenAI-compatible / Auto) |
| Early 2026 | Live Yahoo Finance price enrichment added |
| Early 2026 | Price target + entry zone reconciliation against live prices |
| Early 2026 | Per-item history delete (× button on each history card) |
| Early 2026 | Safari `-webkit-backdrop-filter` compatibility fix |
| Apr 2026 | PDF export rewritten — dedicated print window with full report HTML |
| May 2026 | PDF export switched to hidden iframe — no blank tab, user controls orientation/zoom |
| May 2026 | 6 UI themes implemented (Goldman Dark, Bloomberg Terminal, Paper/Light, Cyber Neon, Forest ESG, High Contrast) with persistent theme switcher in header |
| May 2026 | `start_dev.bat` / `start_deploy.bat` PowerShell redirect error fixed |

import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const SECTORS = [
  { id: 'technology', name: 'Technology', icon: '💻', desc: 'AI · Semiconductors · Cloud · Software', color: '#4a9fd4', tickers: 'NVDA, MSFT, META, GOOGL, PLTR' },
  { id: 'energy', name: 'Energy', icon: '⚡', desc: 'Oil · Gas · LNG · Renewables · Midstream', color: '#2ecc8a', tickers: 'XOM, CVX, COP, LNG, NEE' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', desc: 'Pharma · Biotech · Devices · Managed Care', color: '#4a9fd4', tickers: 'LLY, UNH, ISRG, ABBV, JNJ' },
  { id: 'financials', name: 'Financials', icon: '🏦', desc: 'Banks · Insurance · Fintech · Asset Mgmt', color: '#c9963a', tickers: 'JPM, GS, BRK.B, V, PYPL' },
  { id: 'consumer', name: 'Consumer', icon: '🛍️', desc: 'Retail · Luxury · Restaurants · Travel', color: '#e07a30', tickers: 'AMZN, TSLA, MCD, LVMH, SBUX' },
  { id: 'industrials', name: 'Industrials', icon: '⚙️', desc: 'Aerospace · Defense · Machinery · Rail', color: '#a070d8', tickers: 'RTX, HON, GE, UPS, CAT' },
  { id: 'realestate', name: 'Real Estate', icon: '🏢', desc: 'REITs · Commercial · Residential · Infra', color: '#30c4b0', tickers: 'PLD, EQIX, AMT, SPG, O' },
  { id: 'materials', name: 'Materials', icon: '⛏️', desc: 'Mining · Chemicals · Steel · Lithium', color: '#e07a30', tickers: 'BHP, FCX, LIN, NEM, ALB' },
  { id: 'utilities', name: 'Utilities', icon: '💡', desc: 'Electric · Water · Gas · Nuclear', color: '#4a9fd4', tickers: 'NEE, DUK, SO, AWK, CEG' },
  { id: 'crypto', name: 'Crypto / Web3', icon: '₿', desc: 'Bitcoin · Exchanges · Mining · Blockchain', color: '#f5d070', tickers: 'COIN, MSTR, MARA, RIOT, HOOD' },
  { id: 'defense', name: 'Defense & Space', icon: '🚀', desc: 'Aerospace · Cyber · Intelligence · Drones', color: '#a070d8', tickers: 'LMT, NOC, RTX, SPCE, KTOS' },
  { id: 'ai', name: 'AI & Robotics', icon: '🤖', desc: 'Foundation Models · Agents · Automation', color: '#30c4b0', tickers: 'NVDA, MSFT, PLTR, TSLA, AI' },
]

const DEFAULT_PROFILE = {
  risk: 'Moderate',
  horizon: '2 years',
  strategy: 'Growth',
  cap: 'Large Cap',
}

const CONFIG_OPTIONS = {
  risk: ['Low', 'Moderate', 'High', 'Aggressive'],
  horizon: ['6 months', '1 year', '2 years', '5 years'],
  strategy: ['Value', 'Growth', 'Income / Dividend', 'Momentum'],
  cap: ['Small Cap', 'Mid Cap', 'Large Cap', 'Mega Cap'],
}

const CONFIG_LABELS = {
  risk: 'Risk Tolerance',
  horizon: 'Investment Horizon',
  strategy: 'Strategy Focus',
  cap: 'Market Cap Focus',
}

const CONFIG_SHORT_LABELS = {
  risk: { Low: 'Low', Moderate: 'Moderate', High: 'High', Aggressive: 'Aggressive' },
  horizon: { '6 months': '6 Mo', '1 year': '1 Yr', '2 years': '2 Yr', '5 years': '5 Yr' },
  strategy: { Value: 'Value', Growth: 'Growth', 'Income / Dividend': 'Dividend', Momentum: 'Momentum' },
  cap: { 'Small Cap': 'Small', 'Mid Cap': 'Mid', 'Large Cap': 'Large', 'Mega Cap': 'Mega' },
}

const LOADING_STEPS = ['Screening Universe', 'Valuation Analysis', 'Pipeline & Catalysts', 'Risk Assessment', 'Building Report']
const REPORT_API_URL = '/api/research-report'
const REPORT_HISTORY_STORAGE_KEY = 'stocks-scanner-report-history-v1'
const API_PROVIDER_STORAGE_KEY = 'stocks-scanner-api-provider-v1'
const REPORT_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_HISTORY_ITEMS = 20
const API_PROVIDER_OPTIONS = [
  { id: 'auto', label: 'Auto', shortLabel: 'Auto' },
  { id: 'anthropic', label: 'Claude (Anthropic)', shortLabel: 'Claude' },
  { id: 'openai', label: 'OpenAI / Other Compatible', shortLabel: 'OpenAI/Other' },
]

const THEME_STORAGE_KEY = 'stocks-scanner-theme-v1'
const THEMES = [
  { id: 'default',   label: 'Goldman Dark',        swatch: '#c9963a' },
  { id: 'bloomberg', label: 'Bloomberg Terminal',   swatch: '#ff9900' },
  { id: 'paper',     label: 'Paper / Light',        swatch: '#8b5e0a' },
  { id: 'cyber',     label: 'Cyber Neon',           swatch: '#00ffe0' },
  { id: 'forest',    label: 'Forest ESG',           swatch: '#7ab648' },
  { id: 'hc',        label: 'High Contrast',        swatch: '#ffffff' },
]

function buildRequestKey(sector, profile, specificTicker, aiProvider) {
  const normalizedTicker = typeof specificTicker === 'string' ? specificTicker.trim().toUpperCase() : ''
  return JSON.stringify({
    sectorId: sector?.id || '',
    profile: {
      risk: profile?.risk || '',
      horizon: profile?.horizon || '',
      strategy: profile?.strategy || '',
      cap: profile?.cap || '',
    },
    aiProvider: aiProvider || 'auto',
    ticker: normalizedTicker,
  })
}

function formatAge(ms) {
  const minutes = Math.floor(ms / 60000)
  if (minutes <= 0) return 'just now'
  if (minutes === 1) return '1 minute ago'
  return `${minutes} minutes ago`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeForHtml(value) {
  if (typeof value === 'string') return escapeHtml(value)
  if (Array.isArray(value)) return value.map((item) => sanitizeForHtml(item))
  if (value && typeof value === 'object') {
    const out = {}
    Object.keys(value).forEach((key) => {
      out[key] = sanitizeForHtml(value[key])
    })
    return out
  }
  return value
}

function buildPrompt(sector, profile, specificTicker) {
  const normalizedTicker = typeof specificTicker === 'string' ? specificTicker.trim().toUpperCase() : ''
  const isSingleStockMode = Boolean(normalizedTicker)

  return `You are a senior Goldman Sachs equity analyst. Generate a comprehensive ${isSingleStockMode ? `single-stock report centered on ${normalizedTicker} within` : 'stock screening report for'} the ${sector.name} sector.

Investment profile:
- Risk tolerance: ${profile.risk}
- Horizon: ${profile.horizon}
- Strategy: ${profile.strategy}
- Market cap focus: ${profile.cap}

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks):

{
  "sectorName": "${sector.name}",
  "sectorTheme": "One powerful sentence describing the 2026 investment thesis for this sector",
  "macro": [
    {"label": "Key Metric 1", "value": "value", "change": "+X%", "direction": "up"},
    {"label": "Key Metric 2", "value": "value", "change": "note", "direction": "neutral"},
    {"label": "Key Metric 3", "value": "value", "change": "+X%", "direction": "up"},
    {"label": "Key Metric 4", "value": "value", "change": "note", "direction": "up"},
    {"label": "Key Metric 5", "value": "value", "change": "note", "direction": "neutral"}
  ],
  "stocks": [
    {
      "ticker": "TICK",
      "company": "Full Company Name",
      "subsector": "Subsector label",
      "rating": "STRONG BUY",
      "pe": "~XX x fwd",
      "sectorAvgPe": "~XX x",
      "revGrowth": "+XX%",
      "revGrowthPositive": true,
      "revBars": [40, 55, 65, 80, 100],
      "de": "0.XX",
      "deNote": "Short balance sheet note",
      "divYield": "X.XX%",
      "divNote": "Short dividend sustainability note",
      "moat": "Strong",
      "bullTarget": "$XXX",
      "bearTarget": "$XXX",
      "currentPrice": "$XXX",
      "bullPct": 85,
      "bearPct": 10,
      "currentPct": 45,
      "bullCase": "2-3 sentence bull case with specific catalysts and data points",
      "bearCase": "2-3 sentence bear case with specific risks",
      "entryLow": "$XXX",
      "entryHigh": "$XXX",
      "stopLoss": "$XXX",
      "risk": 6,
      "riskNote": "One sentence explaining the risk rating",
      "buyPct": 75,
      "holdPct": 20,
      "sellPct": 5,
      "analystNote": "Wall Street consensus summary with key analyst names/PTs",
      "catalysts": ["Catalyst 1", "Catalyst 2", "Catalyst 3", "Catalyst 4"]
    }
  ],
  "disclaimer": "Standard investment disclaimer text"
}

Requirements:
- ${isSingleStockMode ? `Generate exactly 1 stock, and it must be ${normalizedTicker}` : `Generate exactly 10 stocks for the ${sector.name} sector`}
- Tailor picks to the ${profile.risk} risk / ${profile.strategy} / ${profile.cap} profile
- Use real, well-known ticker data from the ${sector.name} sector
- All numbers should be realistic and grounded in current market data as of early 2026
- revBars should be 5 numbers from 0-100 showing relative revenue trend (last value = latest year)
- bullPct, bearPct, currentPct should be 0-100 to position on price target bar (bearPct < currentPct < bullPct)
- risk should be 1-10 integer
- buyPct + holdPct + sellPct should sum to 100
- ratings: "STRONG BUY", "BUY", or "HOLD"
- moat: "Strong", "Moderate", or "Weak"`
}

function renderReportHtml(data, profile) {
  const safeData = sanitizeForHtml(data || {})
  const safeProfile = sanitizeForHtml(profile || {})
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const ratingBadge = (rating) => {
    if (rating === 'STRONG BUY') return '<span class="badge badge-sb">STRONG BUY</span>'
    if (rating === 'BUY') return '<span class="badge badge-b">BUY</span>'
    return '<span class="badge badge-h">HOLD</span>'
  }

  const moatEl = (moat) => {
    const cls = moat === 'Strong' ? 'badge-strong' : 'badge-mod'
    const icon = moat === 'Strong' ? '⬟' : '◈'
    return `<span class="scard-moat ${cls}">${icon} ${moat} Moat</span>`
  }

  const riskColor = (risk) => (risk <= 3 ? '#2ecc8a' : risk <= 6 ? '#e8b84a' : '#e05060')
  const dirColor = (direction) => (direction === 'up' ? 'pos' : direction === 'down' ? 'neg' : 'neu')

  const tableRows = (safeData.stocks || []).map((stock) => `
    <tr>
      <td class="td-ticker">${stock.ticker}</td>
      <td class="td-company">${stock.company}</td>
      <td>${ratingBadge(stock.rating)}</td>
      <td class="td-mono">${stock.currentPrice || (stock.livePrice ? `$${stock.livePrice}` : 'N/A')}</td>
      ${Number.isFinite(Number(stock.liveChangePct)) ? `<td class="${Number(stock.liveChangePct) >= 0 ? 'td-up' : 'td-down'}">${Number(stock.liveChangePct) >= 0 ? '+' : ''}${Number(stock.liveChangePct).toFixed(2)}%</td>` : '<td class="td-mono">N/A</td>'}
      <td><div style="font-family:'JetBrains Mono',monospace;font-size:12px">${stock.pe}</div><div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--silver)">Avg: ${stock.sectorAvgPe}</div></td>
      <td class="${stock.revGrowthPositive ? 'td-up' : 'td-down'}">${stock.revGrowth}</td>
      <td class="td-mono">${stock.de}</td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--gold2)">${stock.divYield}</span></td>
      <td>${stock.moat === 'Strong' ? '<span class="badge-strong">⬟ Strong</span>' : '<span class="badge-mod">◈ Moderate</span>'}</td>
      <td class="td-up td-mono">${stock.bullTarget}</td>
      <td class="td-down td-mono">${stock.bearTarget}</td>
      <td style="color:${riskColor(stock.risk)};font-family:'JetBrains Mono',monospace;font-weight:600">${stock.risk}/10</td>
    </tr>`).join('')

  const cards = (safeData.stocks || []).map((stock, index) => {
    const bars = (stock.revBars || [40, 55, 65, 80, 100]).map((value, idx, arr) => {
      const height = Math.max(3, Math.round((value / 100) * 32))
      const isLast = idx === arr.length - 1
      const bg = isLast ? '' : `background: rgba(74,159,212,${0.2 + value / 200})`
      return `<div class="rev-bar" style="height:${height}px;${bg}"></div>`
    }).join('')

    const catalysts = (stock.catalysts || []).map((catalyst) =>
      `<span style="font-family:'JetBrains Mono',monospace;font-size:8px;padding:2px 7px;border-radius:10px;background:rgba(74,159,212,0.08);border:1px solid rgba(74,159,212,0.18);color:#7aaccc;display:inline-block;margin:2px">${catalyst}</span>`,
    ).join('')

    const rangeW = (stock.bullPct || 85) - (stock.bearPct || 10)

    return `
    <div class="scard" style="animation-delay:${index * 0.05}s">
      <div class="scard-top">
        <div>
          <div class="scard-ticker">${stock.ticker}</div>
          <div class="scard-company">${stock.company}</div>
          <div class="scard-sub">${stock.subsector}</div>
        </div>
        <div class="scard-right">
          ${ratingBadge(stock.rating)}
          ${moatEl(stock.moat)}
        </div>
      </div>

      <div class="scard-metrics">
        <div><div class="scard-metric-label">Fwd P/E</div><div class="scard-metric-val">${stock.pe}</div><div class="scard-metric-sub">Sector: ${stock.sectorAvgPe}</div></div>
        <div><div class="scard-metric-label">Rev Growth</div><div class="scard-metric-val" style="color:${stock.revGrowthPositive ? 'var(--green)' : 'var(--red)'};font-size:11px">${stock.revGrowth}</div></div>
        <div><div class="scard-metric-label">Debt / Equity</div><div class="scard-metric-val">${stock.de}</div><div class="scard-metric-sub">${stock.deNote}</div></div>
        <div><div class="scard-metric-label">Dividend</div><div class="scard-metric-val" style="color:var(--gold2)">${stock.divYield}</div><div class="scard-metric-sub">${stock.divNote}</div></div>
      </div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:7.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--silver);margin-bottom:5px">5-Year Revenue Trend</div>
      <div class="rev-bars">${bars}</div>
      <div class="rev-years"><span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span></div>

      <div style="margin-bottom:12px;font-size:8.5px;color:var(--silver)">${catalysts}</div>

      <div class="target-track-wrap">
        <div class="target-track-label">12-Month Price Target Range</div>
        <div class="target-track">
          <div class="target-fill" style="left:${stock.bearPct || 10}%;width:${rangeW}%;background:linear-gradient(90deg,rgba(224,80,96,0.2),rgba(46,204,138,0.2))"></div>
          <div class="target-pin" style="left:${stock.currentPct || 45}%"></div>
        </div>
        <div class="target-labels">
          <span style="color:var(--red)">Bear ${stock.bearTarget}</span>
          <span style="color:var(--gold2)">Now ${stock.currentPrice}</span>
          <span style="color:var(--green)">Bull ${stock.bullTarget}</span>
        </div>
      </div>

      <div class="cases-grid">
        <div class="case case-bull"><div class="case-head">🐂 Bull Case</div><div class="case-body">${stock.bullCase}</div></div>
        <div class="case case-bear"><div class="case-head">🐻 Bear Case</div><div class="case-body">${stock.bearCase}</div></div>
      </div>

      <div class="entry-strip">
        <div><div class="entry-item-label">Entry Zone</div><div class="entry-item-val buy-color">${stock.entryLow}-${stock.entryHigh}</div></div>
        <div><div class="entry-item-label">Current Price</div><div class="entry-item-val curr-color">${stock.currentPrice}</div></div>
        <div><div class="entry-item-label">Stop Loss</div><div class="entry-item-val stop-color">${stock.stopLoss}</div></div>
      </div>

      <div style="margin-bottom:8px">
        <div class="scard-metric-label" style="margin-bottom:4px">Wall Street Consensus</div>
        <div class="consensus-bar">
          <div class="c-b" style="width:${stock.buyPct || 70}%"></div>
          <div class="c-h" style="width:${stock.holdPct || 20}%"></div>
          <div class="c-s" style="width:${stock.sellPct || 10}%"></div>
        </div>
        <div class="consensus-legend">
          <span style="color:var(--green)">Buy ${stock.buyPct || 70}%</span>
          <span style="color:var(--gold2)">Hold ${stock.holdPct || 20}%</span>
          <span style="color:var(--red)">Sell ${stock.sellPct || 10}%</span>
        </div>
        <div style="font-size:8.5px;color:#3a5870;margin-top:3px">${stock.analystNote}</div>
      </div>

      <div class="risk-row">
        <div class="risk-label-txt">Risk</div>
        <div class="risk-track"><div class="risk-fill" style="width:${stock.risk * 10}%"></div></div>
        <div class="risk-num" style="color:${riskColor(stock.risk)}">${stock.risk}/10</div>
      </div>
      <div class="risk-note-txt" style="margin-top:4px">${stock.riskNote}</div>
    </div>`
  }).join('')

  const macroCells = (safeData.macro || []).map((macro) => `
    <div class="macro-cell">
      <div class="macro-cell-label">${macro.label}</div>
      <div class="macro-cell-val">${macro.value}</div>
      <div class="macro-cell-chg ${dirColor(macro.direction)}">${macro.change}</div>
    </div>`).join('')

  const snapshotRows = (safeData.marketSnapshot?.benchmarks || []).map((row) => {
    const changePct = Number(row.changePct)
    const changeClass = Number.isFinite(changePct) ? (changePct >= 0 ? 'pos' : 'neg') : 'neu'
    const pctText = Number.isFinite(changePct) ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : 'N/A'
    const pxText = typeof row.price === 'number' ? row.price.toFixed(2) : 'N/A'
    return `<div class="market-snap-item"><span class="market-snap-ticker">${row.ticker}</span><span class="market-snap-price">${pxText}</span><span class="market-snap-chg ${changeClass}">${pctText}</span></div>`
  }).join('')

  const liveAsOf = safeData.marketSnapshot?.asOf
    ? new Date(safeData.marketSnapshot.asOf).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return `
    <div class="report-output" style="animation: fadeUp 0.5s ease both">
      <div class="rpt-header">
        <div class="rpt-title-block">
          <div class="rpt-eyebrow">Goldman Sachs · Global Investment Research</div>
          <div class="rpt-title">${safeData.sectorName} Sector Research</div>
          <div class="rpt-sub">${safeData.sectorTheme}</div>
        </div>
        <div class="rpt-meta">
          <div class="rpt-meta-row">Date: <span class="rpt-meta-val">${dateStr}</span></div>
          <div class="rpt-meta-row">Risk Profile: <span class="rpt-meta-val">${safeProfile.risk}</span></div>
          <div class="rpt-meta-row">Horizon: <span class="rpt-meta-val">${safeProfile.horizon}</span></div>
          <div class="rpt-meta-row">Strategy: <span class="rpt-meta-val">${safeProfile.strategy}</span></div>
          <div class="rpt-meta-row">Cap Focus: <span class="rpt-meta-val">${safeProfile.cap}</span></div>
        </div>
      </div>

      ${snapshotRows ? `<div class="market-snap-wrap"><div class="market-snap-head">Live Market Snapshot · ${safeData.marketSnapshot?.source || 'Market Data'}${liveAsOf ? ` · ${liveAsOf}` : ''}</div><div class="market-snap-grid">${snapshotRows}</div></div>` : ''}

      <div class="macro-strip">${macroCells}</div>

      <div class="section-label" style="margin-bottom:16px">Executive Summary Table</div>
      <div class="summary-wrap">
        <div class="table-scroll">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Ticker</th><th>Company</th><th>Rating</th>
                <th>Live Px</th><th>1D%</th><th>P/E vs Sector</th><th>Rev Growth</th><th>D/E</th>
                <th>Dividend</th><th>Moat</th><th>Bull Target</th>
                <th>Bear Target</th><th>Risk /10</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>

      <div class="cards-label" style="margin-bottom:20px">Individual Stock Deep Dive</div>
      <div class="cards-grid">${cards}</div>

      <div class="rpt-disclaimer">
        <strong>IMPORTANT DISCLAIMER:</strong> ${safeData.disclaimer || 'This report is generated by AI for informational and educational purposes only. It does not constitute financial, investment, or legal advice. All data is synthesized and may not reflect real-time market conditions. Past performance is not indicative of future results. Always consult a licensed financial advisor before making investment decisions.'}
      </div>
    </div>`
}

function App() {
  const [selectedSector, setSelectedSector] = useState(null)
  const [specificTicker, setSpecificTicker] = useState('')
  const [aiProvider, setAiProvider] = useState(() => {
    try {
      const saved = localStorage.getItem(API_PROVIDER_STORAGE_KEY)
      if (!saved) return 'auto'
      if (API_PROVIDER_OPTIONS.some((option) => option.id === saved)) return saved
      return 'auto'
    } catch {
      return 'auto'
    }
  })
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [reportHtml, setReportHtml] = useState('')
  const [reportData, setReportData] = useState(null)
  const [reportHistory, setReportHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(REPORT_HISTORY_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [historyNowTs, setHistoryNowTs] = useState(() => Date.now())
  const [cacheNotice, setCacheNotice] = useState('')
  const reportSectionRef = useRef(null)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved && THEMES.some((t) => t.id === saved)) return saved
      return 'default'
    } catch {
      return 'default'
    }
  })

  const headerDate = useMemo(() => {
    const now = new Date()
    return `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EST`
  }, [])

  useEffect(() => {
    if (!isGenerating) return undefined
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
    }, 800)
    return () => clearInterval(interval)
  }, [isGenerating])

  useEffect(() => {
    if (showReport) {
      reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showReport])

  useEffect(() => {
    if (!reportHistory.length) return undefined
    const timer = setInterval(() => setHistoryNowTs(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [reportHistory.length])

  useEffect(() => {
    try {
      localStorage.setItem(API_PROVIDER_STORAGE_KEY, aiProvider)
    } catch {
      // Ignore localStorage quota or privacy mode errors.
    }
  }, [aiProvider])

  useEffect(() => {
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore localStorage quota or privacy mode errors.
    }
  }, [theme])

  const updateProfile = (group, value) => {
    setProfile((prev) => ({ ...prev, [group]: value }))
  }

  const persistHistory = (items) => {
    setReportHistory(items)
    try {
      localStorage.setItem(REPORT_HISTORY_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore localStorage quota or privacy mode errors.
    }
  }

  const saveHistoryEntry = (entry) => {
    const withoutSame = reportHistory.filter((item) => item.requestKey !== entry.requestKey)
    const next = [entry, ...withoutSame].slice(0, MAX_HISTORY_ITEMS)
    persistHistory(next)
  }

  const loadHistoryEntry = (entry) => {
    const sector = SECTORS.find((item) => item.id === entry.sectorId)
    if (sector) setSelectedSector(sector)
    setSpecificTicker(entry.specificTicker || '')
    setAiProvider(entry.aiProvider || 'auto')
    setProfile(entry.profile || DEFAULT_PROFILE)
    setReportData(entry.report || null)
    setReportHtml(renderReportHtml(entry.report || {}, entry.profile || DEFAULT_PROFILE))
    setShowReport(true)
    setCacheNotice(`Loaded from history (${formatAge(Date.now() - entry.createdAt)}).`)
  }

  const clearHistory = () => {
    persistHistory([])
    setCacheNotice('History cleared.')
  }

  const deleteHistoryEntry = (e, id) => {
    e.stopPropagation()
    persistHistory(reportHistory.filter((item) => item.id !== id))
  }

  const buildShareText = () => {
    if (!reportData || typeof reportData !== 'object') return ''

    const sectorName = reportData.sectorName || selectedSector?.name || 'Selected Sector'
    const theme = reportData.sectorTheme || ''
    const picks = Array.isArray(reportData.stocks) ? reportData.stocks.slice(0, 5) : []
    const pickLines = picks
      .map((stock, idx) => `${idx + 1}. ${stock?.ticker || 'N/A'}${stock?.rating ? ` (${stock.rating})` : ''}`)
      .join('\n')

    const profileLine = `${profile.risk} risk | ${profile.horizon} | ${profile.strategy} | ${profile.cap}`
    const appUrl = window.location.origin

    return [
      'AI Stock Screener Report',
      `Sector: ${sectorName}`,
      theme ? `Theme: ${theme}` : '',
      `Profile: ${profileLine}`,
      pickLines ? `Top Picks:\n${pickLines}` : '',
      `View or regenerate in app: ${appUrl}`,
    ].filter(Boolean).join('\n\n')
  }

  const shareOnWhatsApp = () => {
    const text = buildShareText()
    if (!text) return
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const exportReportPdf = () => {
    if (!reportHtml) return

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n')
        } catch {
          return sheet.href ? `@import url("${sheet.href}");` : ''
        }
      })
      .join('\n')

    // Use a hidden iframe so no blank tab appears.
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'print-frame')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden'
    document.body.appendChild(iframe)

    iframe.addEventListener('load', () => {
      // Clean up after the print dialog is dismissed.
      iframe.contentWindow.addEventListener('afterprint', () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
      })
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    })

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stock Research Report</title>
<style>
${styles}
/* Let the browser print dialog control orientation and zoom. */
@page { size: auto; margin: 15mm; }
:root {
  --ink: #fff;
  --ink2: #f5f5f5;
  --gold: #9a6a10;
  --gold2: #7a5008;
  --gold3: #5a3800;
  --silver: #555;
  --cream: #111;
  --border: rgba(0,0,0,0.15);
  --border2: rgba(0,0,0,0.1);
  --text: #111;
  --text2: #555;
  --green: #1a7a40;
  --red: #b03040;
  --blue: #2060a0;
  --purple: #6040a0;
  --orange: #a04010;
  --teal: #107060;
  --r: 4px;
}
body { background: #fff; color: #111; font-family: 'Instrument Sans', sans-serif; margin: 0; padding: 16px; }
body::after, .bg-glow, .header, .hero, .sector-section, .config-section,
.api-settings-section, .generate-section, .history-section, .report-actions,
.loading-overlay, .cache-notice { display: none !important; }
.report-section { display: block !important; padding: 0 !important; max-width: none; margin: 0; }
.report-output, .rpt-header, .macro-strip, .summary-wrap, .scard, .rpt-disclaimer {
  background: #fff !important; color: #111 !important; border-color: #ddd !important; box-shadow: none !important;
}
.summary-wrap, .table-scroll, .macro-strip { overflow: visible !important; }
.stock-table { font-size: 9px !important; width: 100% !important; }
.stock-table thead th, .stock-table td { padding: 5px 5px !important; font-size: 8px !important; white-space: normal !important; }
.scard { page-break-inside: avoid !important; break-inside: avoid !important; }
.rpt-header { page-break-inside: avoid !important; break-inside: avoid !important; }
.cards-grid { grid-template-columns: 1fr 1fr !important; }
.market-snap-wrap { background: #fff !important; border-color: #ddd !important; }
.td-ticker, .scard-ticker { color: #7a5008 !important; }
.td-up, .pos { color: #1a7a40 !important; }
.td-down, .neg { color: #b03040 !important; }
.neu { color: #7a5008 !important; }
.badge-sb { background: rgba(26,122,64,0.1) !important; color: #1a7a40 !important; }
.badge-b { background: rgba(32,96,160,0.1) !important; color: #2060a0 !important; }
.badge-h { background: rgba(122,80,8,0.1) !important; color: #7a5008 !important; }
</style>
</head>
<body>
<div class="report-section visible">
${reportHtml}
</div>
</body>
</html>`)
    iframeDoc.close()
  }

  const generateReport = async () => {
    if (!selectedSector || isGenerating) return

    const requestKey = buildRequestKey(selectedSector, profile, specificTicker, aiProvider)
    const recent = reportHistory.find((entry) => entry.requestKey === requestKey)
    if (recent && Date.now() - recent.createdAt <= REPORT_CACHE_TTL_MS) {
      loadHistoryEntry(recent)
      setCacheNotice(`Used cached report from ${formatAge(Date.now() - recent.createdAt)}.`)
      return
    }

    setLoadingStep(0)
    setIsGenerating(true)
    setShowReport(true)
    setReportData(null)
    setCacheNotice('')

    try {
      const prompt = buildPrompt(selectedSector, profile, specificTicker)
      const res = await fetch(REPORT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sector: selectedSector.id,
          profile,
          aiProvider,
          ticker: specificTicker.trim().toUpperCase(),
        }),
      })

      const responsePayload = await res.json().catch(() => ({}))

      if (!res.ok) {
        const details = responsePayload?.error || responsePayload?.message || `Server request failed (${res.status})`
        throw new Error(details)
      }

      const data = responsePayload
      const raw = data.content?.[0]?.text || data.raw || data.text || ''

      let json
      if (data.report && typeof data.report === 'object') {
        json = data.report
      } else {
        try {
          const clean = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
          json = JSON.parse(clean)
        } catch {
          const match = raw.match(/\{[\s\S]*\}/)
          if (match) {
            json = JSON.parse(match[0])
          } else {
            throw new Error('No JSON found in response')
          }
        }
      }

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        requestKey,
        createdAt: Date.now(),
        sectorId: selectedSector.id,
        sectorName: selectedSector.name,
        specificTicker: specificTicker.trim().toUpperCase(),
        aiProvider,
        profile,
        report: json,
      }
      saveHistoryEntry(entry)

      setReportData(json)
      setReportHtml(renderReportHtml(json, profile))
    } catch (err) {
      const safeMessage = escapeHtml(err?.message || 'Unknown error')
      setReportData(null)
      setReportHtml(`<div class="error-box"><h3>Report Generation Error</h3><p>Unable to generate report: ${safeMessage}. Please try again.</p></div>`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="app">
        <header className="header">
          <div className="logo">
            <span className="logo-main">Goldman Sachs</span>
            <span className="logo-sep">|</span>
            <span className="logo-sub">AI Equity Research</span>
          </div>
          <div className="header-right">
            <div className="live-badge">
              <div className="live-dot"></div>
              AI Powered
            </div>
            <div className="theme-switcher" title="Switch theme">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
                  style={{ '--swatch': t.swatch }}
                  title={t.label}
                  onClick={() => setTheme(t.id)}
                />
              ))}
            </div>
            <div className="header-date">{headerDate}</div>
          </div>
        </header>

        <div className="hero">
          <div className="hero-eyebrow">Global Investment Research</div>
          <h1 className="hero-title">
            Institutional-Grade
            <br />
            <span className="accent">Stock Screening</span>
          </h1>
          <p className="hero-sub">
            Select a sector, configure your investment profile, and receive a Goldman Sachs-style equity research report with top 10 picks,
            valuation analysis, and price targets generated in real time by AI.
          </p>
        </div>

        <div className="sector-section">
          <div className="section-label">Select Sector</div>
          <div className="sectors-grid">
            {SECTORS.map((sector, index) => (
              <div
                key={sector.id}
                className={`sector-card ${selectedSector?.id === sector.id ? 'active' : ''}`}
                style={{ '--sector-color': sector.color, animationDelay: `${index * 0.04}s` }}
                onClick={() => setSelectedSector(sector)}
              >
                <span className="sector-ticker-count">{sector.tickers.split(',').length} picks</span>
                <span className="sector-icon">{sector.icon}</span>
                <div className="sector-name">{sector.name}</div>
                <div className="sector-desc">{sector.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="config-section">
          <div className="section-label">Investment Profile</div>
          <div className="config-grid">
            {Object.keys(CONFIG_OPTIONS).map((group) => (
              <div className="config-group" key={group}>
                <div className="config-label">{CONFIG_LABELS[group]}</div>
                <div className="config-options">
                  {CONFIG_OPTIONS[group].map((option) => (
                    <button
                      key={`${group}-${option}`}
                      type="button"
                      className={`config-btn ${profile[group] === option ? 'active' : ''}`}
                      onClick={() => updateProfile(group, option)}
                    >
                      {CONFIG_SHORT_LABELS[group][option]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="api-settings-section">
          <div className="section-label">API Settings</div>
          <div className="api-settings-card">
            <div className="config-label">Provider</div>
            <div className="config-options">
              {API_PROVIDER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`config-btn ${aiProvider === option.id ? 'active' : ''}`}
                  onClick={() => setAiProvider(option.id)}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
            <div className="api-settings-help">
              Auto uses server default from env. OpenAI/Other uses your OPENAI_* settings and can point to OpenAI-compatible endpoints.
            </div>
          </div>
        </div>

        <div className="generate-section">
          <div className="ticker-input-wrap">
            <label htmlFor="specific-ticker" className="ticker-input-label">Specific Ticker (Optional)</label>
            <input
              id="specific-ticker"
              className="ticker-input"
              type="text"
              inputMode="text"
              placeholder="e.g. NVDA"
              maxLength={10}
              value={specificTicker}
              onChange={(event) => {
                const cleaned = event.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, '')
                setSpecificTicker(cleaned)
              }}
            />
            <div className="ticker-input-help">If provided, the report will focus on this single stock.</div>
          </div>

          <button className="generate-btn" type="button" onClick={generateReport} disabled={!selectedSector || isGenerating}>
            {isGenerating ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-6.22-8.56" />
                </svg>
                Generating Report...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {showReport ? 'Regenerate Report' : 'Generate Research Report'}
              </>
            )}
          </button>
          <div className="no-sector-msg" style={{ opacity: selectedSector ? 0 : 1 }}>
            {'<- Select a sector above to enable report generation'}
          </div>
          {cacheNotice && <div className="cache-notice">{cacheNotice}</div>}
        </div>

        {reportHistory.length > 0 && (
          <div className="history-section">
            <div className="history-head">
              <div className="section-label" style={{ marginBottom: 12 }}>Recent Reports</div>
              <button className="history-clear-btn" type="button" onClick={clearHistory}>Clear</button>
            </div>
            <div className="history-grid">
              {reportHistory.slice(0, 8).map((entry) => (
                <button key={entry.id} type="button" className="history-card" onClick={() => loadHistoryEntry(entry)}>
                  <div className="history-card-header">
                    <div className="history-card-title">{entry.specificTicker || entry.sectorName}</div>
                    <button type="button" className="history-card-del" onClick={(e) => deleteHistoryEntry(e, entry.id)} title="Remove">✕</button>
                  </div>
                  <div className="history-card-sub">{entry.specificTicker ? `${entry.sectorName} sector` : `${entry.profile?.risk || ''} • ${entry.profile?.strategy || ''}`}</div>
                  <div className="history-card-provider">API: {entry.aiProvider || 'auto'}</div>
                  <div className="history-card-time">{new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {formatAge(historyNowTs - entry.createdAt)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={reportSectionRef} className={`report-section ${showReport ? 'visible' : ''}`}>
          {isGenerating && (
            <div className="loading-overlay">
              <div className="loading-title">Analyzing {selectedSector?.name} Sector...</div>
              <div className="loading-sub">Running Goldman Sachs screening framework • Senior Analyst Mode</div>
              <div className="loading-bar-wrap">
                <div className="loading-bar"></div>
              </div>
              <div className="loading-steps">
                {LOADING_STEPS.map((step, idx) => {
                  const stateClass = idx < loadingStep ? 'done' : idx === loadingStep ? 'active' : ''
                  return (
                    <div key={step} className={`loading-step ${stateClass}`}>
                      <div className="step-dot"></div>
                      {step}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!isGenerating && reportHtml && (
            <div className="report-actions">
              <button className="report-action-btn" type="button" onClick={shareOnWhatsApp}>
                Share on WhatsApp
              </button>
              <button className="report-action-btn report-action-btn-secondary" type="button" onClick={exportReportPdf}>
                Export PDF
              </button>
            </div>
          )}

          {!isGenerating && reportHtml && <div dangerouslySetInnerHTML={{ __html: reportHtml }} />}
        </div>
      </div>
    </>
  )
}

export default App

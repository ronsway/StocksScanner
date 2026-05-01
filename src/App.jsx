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

function buildPrompt(sector, profile) {
  return `You are a senior Goldman Sachs equity analyst. Generate a comprehensive stock screening report for the ${sector.name} sector.

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
- Generate exactly 10 stocks for the ${sector.name} sector
- Tailor picks to the ${profile.risk} risk / ${profile.strategy} / ${profile.cap} profile
- Use real, well-known tickers from the ${sector.name} sector
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

      <div class="macro-strip">${macroCells}</div>

      <div class="section-label" style="margin-bottom:16px">Executive Summary Table</div>
      <div class="summary-wrap">
        <div class="table-scroll">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Ticker</th><th>Company</th><th>Rating</th>
                <th>P/E vs Sector</th><th>Rev Growth</th><th>D/E</th>
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
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [reportHtml, setReportHtml] = useState('')
  const reportSectionRef = useRef(null)

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

  const updateProfile = (group, value) => {
    setProfile((prev) => ({ ...prev, [group]: value }))
  }

  const generateReport = async () => {
    if (!selectedSector || isGenerating) return

    setLoadingStep(0)
    setIsGenerating(true)
    setShowReport(true)

    try {
      const prompt = buildPrompt(selectedSector, profile)
      const res = await fetch(REPORT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sector: selectedSector.id,
          profile,
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

      setReportHtml(renderReportHtml(json, profile))
    } catch (err) {
      const safeMessage = escapeHtml(err?.message || 'Unknown error')
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

        <div className="generate-section">
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
        </div>

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

          {!isGenerating && reportHtml && <div dangerouslySetInnerHTML={{ __html: reportHtml }} />}
        </div>
      </div>
    </>
  )
}

export default App

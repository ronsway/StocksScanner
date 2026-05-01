import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const anthropicApiKey = process.env.ANTHROPIC_API_KEY
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
const isProduction = process.env.NODE_ENV === 'production'

function isLikelyModelError(errorMessage) {
  if (typeof errorMessage !== 'string') return false
  const msg = errorMessage.toLowerCase()
  return msg.includes('model') && (msg.includes('not found') || msg.includes('invalid') || msg.includes('unknown'))
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '..', 'dist')

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/research-report', async (req, res) => {
  try {
    if (!anthropicApiKey) {
      return res.status(500).json({
        error: 'Server is missing ANTHROPIC_API_KEY. Add it to .env before generating reports.',
      })
    }

    const incomingPrompt = req.body?.prompt
    const incomingSector = req.body?.sector
    const incomingProfile = req.body?.profile

    let prompt = typeof incomingPrompt === 'string' ? incomingPrompt.trim() : ''

    if (!prompt && typeof incomingSector === 'string' && incomingSector.trim()) {
      const profileText =
        incomingProfile && typeof incomingProfile === 'object'
          ? `risk=${incomingProfile.risk || 'Moderate'}, horizon=${incomingProfile.horizon || '2 years'}, strategy=${incomingProfile.strategy || 'Growth'}, cap=${incomingProfile.cap || 'Large Cap'}`
          : 'risk=Moderate, horizon=2 years, strategy=Growth, cap=Large Cap'

      prompt = `Generate a comprehensive stock screening report for the ${incomingSector.trim()} sector with profile: ${profileText}. Return valid JSON only.`
    }

    if (!prompt) {
      return res.status(400).json({
        error: 'Request body must include a non-empty prompt string or a sector identifier.',
      })
    }

    const modelsToTry = [...new Set([
      anthropicModel,
      'claude-sonnet-4-20250514',
      'claude-3-7-sonnet-latest',
      'claude-3-5-sonnet-latest',
    ])]

    let response = null
    let payload = {}
    let usedModel = modelsToTry[0]

    for (const model of modelsToTry) {
      usedModel = model
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system:
            'You are a senior equity analyst at Goldman Sachs with 20 years of experience. You produce detailed, professional equity research screening reports in strict JSON format. You respond ONLY with a valid JSON object - no preamble, no markdown, no backticks. The JSON must be complete and parseable.',
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      payload = await response.json().catch(() => ({}))

      if (response.ok) {
        break
      }

      const upstreamMessage = payload?.error?.message || payload?.error || ''
      if (!(response.status === 400 && isLikelyModelError(String(upstreamMessage)))) {
        break
      }
    }

    if (!response || !response.ok) {
      return res.status(response?.status || 502).json({
        error:
          payload?.error?.message ||
          payload?.error ||
          `Upstream API request failed with status ${response?.status || 502}`,
        modelTried: usedModel,
      })
    }

    const raw = payload?.content?.[0]?.text || ''
    let report = null

    try {
      const clean = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
      report = JSON.parse(clean)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          report = JSON.parse(match[0])
        } catch {
          report = null
        }
      }
    }

    return res.json({
      report,
      raw,
      content: payload?.content || [],
      modelUsed: usedModel,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
})

if (isProduction) {
  app.use(express.static(distPath))

  // Serve the React app for non-API routes.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(port, () => {
  const mode = isProduction ? 'production' : 'development'
  console.log(`Research API listening on http://localhost:${port} (${mode})`)
})

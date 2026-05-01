import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const anthropicApiKey = process.env.ANTHROPIC_API_KEY
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

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

    const prompt = req.body?.prompt
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Request body must include a non-empty prompt string.' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 8000,
        system:
          'You are a senior equity analyst at Goldman Sachs with 20 years of experience. You produce detailed, professional equity research screening reports in strict JSON format. You respond ONLY with a valid JSON object - no preamble, no markdown, no backticks. The JSON must be complete and parseable.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || `Upstream API request failed with status ${response.status}`,
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
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
})

app.listen(port, () => {
  console.log(`Research API listening on http://localhost:${port}`)
})

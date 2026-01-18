import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '')

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function requireEnv(res) {
  const missing = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missing.length) {
    json(res, 500, { error: `Missing env vars: ${missing.join(', ')}` })
    return false
  }
  return true
}

function toList(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v ?? '').trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/<br\s*\/?>/gi, '\n')
    const lines = normalized
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length > 1) return lines

    // Some legacy fields arrive as "Q1?Q2?" with no separators.
    const single = lines[0] || ''
    const qParts = single
      .split('?')
      .map((s) => s.trim())
      .filter(Boolean)
    if (qParts.length > 1) return qParts.map((p) => (p.endsWith('?') ? p : `${p}?`))

    // Or comma-separated tools
    if (single.includes(',')) {
      return single
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return [single]
  }
  return [String(value)]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const { level, scores } = req.body || {}
    if (!level || typeof level !== 'string') return json(res, 400, { error: 'Missing level' })
    if (!scores || typeof scores !== 'object') return json(res, 400, { error: 'Missing scores' })

    const categories = ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude']
    const out = {}

    await Promise.all(
      categories.map(async (category) => {
        const scoreValue = scores[category]
        if (!Number.isFinite(scoreValue)) return

        const { data, error } = await supabase
          .from('coaching_content')
          .select('statement_text, questions, coaching_comments, suggested_tools')
          .eq('level', level)
          .eq('category', category)
          .lte('score_min', scoreValue)
          .gte('score_max', scoreValue)
          .limit(1)

        if (error) throw error
        if (!data || !data[0]) return

        const row = data[0]
        out[category] = {
          statement_text: row.statement_text || '',
          questions: toList(row.questions),
          coaching_comments: toList(row.coaching_comments),
          suggested_tools: toList(row.suggested_tools),
        }
      }),
    )

    return json(res, 200, { ok: true, content: out })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


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

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const { resumeToken, responses, vespaScores } = req.body || {}
    const token = String(resumeToken || '').trim()
    if (!token) return json(res, 400, { error: 'Missing resumeToken' })
    if (!responses || typeof responses !== 'object') return json(res, 400, { error: 'Missing responses' })
    if (!vespaScores || typeof vespaScores !== 'object') return json(res, 400, { error: 'Missing vespaScores' })

    const { data: access, error: accessError } = await supabase
      .from('lite_student_access')
      .select('student_id, cycle_id')
      .eq('resume_token', token)
      .eq('is_active', true)
      .maybeSingle()

    if (accessError) return json(res, 400, { error: accessError.message })
    if (!access) return json(res, 404, { error: 'Invalid resume token' })

    const payload = {
      submittedAt: new Date().toISOString(),
      responses,
      vespaScores,
    }

    // Upsert report for this student+cycle (unique index exists).
    const { error: upsertError } = await supabase
      .from('lite_reports')
      .upsert(
        {
          student_id: access.student_id,
          cycle_id: access.cycle_id,
          report_version: 1,
          payload,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,cycle_id' },
      )

    if (upsertError) return json(res, 400, { error: upsertError.message })

    return json(res, 200, { ok: true })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


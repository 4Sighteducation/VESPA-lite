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

function normalizeIsoDate(value) {
  const v = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return v
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const { resumeCode, dateOfBirth } = req.body || {}
    const code = String(resumeCode || '').trim()
    const dob = normalizeIsoDate(dateOfBirth)

    if (!code || !dob) {
      return json(res, 400, { error: 'Missing resumeCode or dateOfBirth (YYYY-MM-DD)' })
    }

    // Demo escape hatch so you can test UI instantly.
    if (code.toLowerCase() === 'demo' && dob === '2000-01-01') {
      return json(res, 200, { ok: true, resumeToken: 'demo' })
    }

    const { data: accessRows, error: accessError } = await supabase
      .from('lite_student_access')
      .select('id, student_id, resume_token')
      .eq('resume_code', code)
      .eq('is_active', true)
      .limit(10)

    if (accessError) return json(res, 400, { error: accessError.message })
    if (!accessRows?.length) return json(res, 404, { error: 'Resume code not found' })

    for (const row of accessRows) {
      const { data: student, error: studentError } = await supabase
        .from('lite_students')
        .select('date_of_birth')
        .eq('id', row.student_id)
        .maybeSingle()

      if (studentError) continue
      const studentDob = student?.date_of_birth ? String(student.date_of_birth).slice(0, 10) : null
      if (studentDob === dob) {
        await supabase
          .from('lite_student_access')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', row.id)
        return json(res, 200, { ok: true, resumeToken: row.resume_token })
      }
    }

    return json(res, 401, { error: 'Date of birth does not match' })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


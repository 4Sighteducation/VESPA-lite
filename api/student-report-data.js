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

function scoresFromPayload(payload) {
  const vs = payload?.vespaScores || payload?.vespa_scores || null
  if (!vs) return null
  const get = (k) => (Number.isFinite(Number(vs?.[k])) ? Number(vs[k]) : null)
  return {
    vision: get('VISION'),
    effort: get('EFFORT'),
    systems: get('SYSTEMS'),
    practice: get('PRACTICE'),
    attitude: get('ATTITUDE'),
    overall: get('OVERALL'),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const token = String(req.query?.token || '').trim()
    if (!token) return json(res, 400, { error: 'Missing token' })

    if (token === 'demo') {
      return json(res, 200, {
        ok: true,
        student: {
          name: 'Student Name',
          yearGroup: '12',
          group: '12A',
          establishment: 'TESTING SCHOOL 1',
          logoUrl: 'https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png',
        },
        cycles: [
          { cycle: 1, completion_date: '2026-01-15', vision: 7, effort: 6, systems: 5, practice: 6, attitude: 8, overall: 6 },
        ],
        hasReport: true,
      })
    }

    // Resolve resume token to student/cycle
    const { data: access, error: accessError } = await supabase
      .from('lite_student_access')
      .select('student_id, cycle_id, is_active')
      .eq('resume_token', token)
      .eq('is_active', true)
      .maybeSingle()

    if (accessError) return json(res, 400, { error: accessError.message })
    if (!access) return json(res, 404, { error: 'Invalid resume token' })

    // Load student + establishment
    const { data: studentRow, error: studentError } = await supabase
      .from('lite_students')
      .select('id, establishment_id, first_name, last_name, email')
      .eq('id', access.student_id)
      .maybeSingle()

    if (studentError) return json(res, 400, { error: studentError.message })
    if (!studentRow) return json(res, 404, { error: 'Student not found' })

    // Optional columns if present (safe to ignore)
    let yearGroup = null
    let tutorGroup = null
    try {
      const { data: extra } = await supabase
        .from('lite_students')
        .select('year_group, tutor_group')
        .eq('id', studentRow.id)
        .maybeSingle()
      yearGroup = extra?.year_group || null
      tutorGroup = extra?.tutor_group || null
    } catch (_) {}

    const { data: est } = await supabase
      .from('establishments')
      .select('name, logo_url')
      .eq('id', studentRow.establishment_id)
      .maybeSingle()

    const student = {
      name: `${studentRow.first_name} ${studentRow.last_name}`.trim(),
      yearGroup: yearGroup ? String(yearGroup) : null,
      group: tutorGroup ? String(tutorGroup) : null,
      establishment: est?.name || null,
      logoUrl: est?.logo_url || null,
    }

    // Load report payload for this student+cycle
    const { data: report, error: reportError } = await supabase
      .from('lite_reports')
      .select('payload, generated_at')
      .eq('student_id', studentRow.id)
      .eq('cycle_id', access.cycle_id)
      .maybeSingle()

    if (reportError) return json(res, 400, { error: reportError.message })

    if (!report) {
      return json(res, 200, { ok: true, student, cycles: [{ cycle: 1, completion_date: null, vision: null, effort: null, systems: null, practice: null, attitude: null, overall: null }], hasReport: false })
    }

    const submittedAt = report?.payload?.submittedAt || report.generated_at || null
    const scores = scoresFromPayload(report.payload) || { vision: null, effort: null, systems: null, practice: null, attitude: null, overall: null }

    return json(res, 200, {
      ok: true,
      student,
      cycles: [
        {
          cycle: 1,
          completion_date: submittedAt ? String(submittedAt).slice(0, 10) : null,
          ...scores,
        },
      ],
      hasReport: true,
    })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


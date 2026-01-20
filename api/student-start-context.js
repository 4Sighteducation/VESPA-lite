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
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const token = String(req.query?.token || '').trim()
    if (!token) return json(res, 400, { error: 'Missing token' })

    if (token === 'demo') {
      return json(res, 200, { mode: 'demo' })
    }

    // 1) Is this a student invite token?
    const { data: invite, error: inviteError } = await supabase
      .from('lite_school_invites')
      .select('establishment_id, cycle_id, invite_type, is_active')
      .eq('invite_token', token)
      .eq('invite_type', 'student')
      .maybeSingle()

    if (inviteError) return json(res, 400, { error: inviteError.message })
    if (invite?.is_active) {
      const { data: est } = await supabase
        .from('establishments')
        .select('id, name, logo_url')
        .eq('id', invite.establishment_id)
        .maybeSingle()

      return json(res, 200, {
        mode: 'invite',
        inviteToken: token,
        establishmentId: invite.establishment_id,
        cycleId: invite.cycle_id,
        establishmentName: est?.name || null,
        logoUrl: est?.logo_url || null,
      })
    }

    // 2) Otherwise treat as a resume token
    const { data: access, error: accessError } = await supabase
      .from('lite_student_access')
      .select('student_id, cycle_id, resume_code, resume_token, is_active')
      .eq('resume_token', token)
      .eq('is_active', true)
      .maybeSingle()

    if (accessError) return json(res, 400, { error: accessError.message })
    if (!access) return json(res, 404, { error: 'Token not found' })

    const { data: student } = await supabase
      .from('lite_students')
      .select('first_name, last_name, date_of_birth, email')
      .eq('id', access.student_id)
      .maybeSingle()

    // optional fields if your DB has them (safe to ignore if not present)
    let extra = {}
    try {
      const { data: extraStudent } = await supabase
        .from('lite_students')
        .select('year_group, tutor_group')
        .eq('id', access.student_id)
        .maybeSingle()
      extra = {
        yearGroup: extraStudent?.year_group || null,
        tutorGroup: extraStudent?.tutor_group || null,
      }
    } catch (_) {}

    return json(res, 200, {
      mode: 'resume',
      resumeToken: access.resume_token,
      resumeCode: access.resume_code,
      cycleId: access.cycle_id,
      student: student
        ? {
            firstName: student.first_name,
            lastName: student.last_name,
            email: student.email || null,
            ...extra,
          }
        : null,
    })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


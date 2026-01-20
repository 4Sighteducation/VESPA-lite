import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

function normalizeIsoDate(v) {
  const s = String(v || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

function makeCode(length = 5) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // avoid 0/O/1/I
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const { inviteToken, firstName, lastName, dateOfBirth, email, yearGroup, tutorGroup } = req.body || {}

    const dob = normalizeIsoDate(dateOfBirth)
    if (!inviteToken || !firstName || !lastName || !dob) {
      return json(res, 400, { error: 'Missing required fields' })
    }

    const { data: invite, error: inviteError } = await supabase
      .from('lite_school_invites')
      .select('establishment_id, cycle_id, invite_type, is_active')
      .eq('invite_token', String(inviteToken).trim())
      .eq('invite_type', 'student')
      .maybeSingle()

    if (inviteError || !invite || !invite.is_active) {
      return json(res, 400, { error: 'Invalid or inactive invite token' })
    }
    if (!invite.cycle_id) {
      return json(res, 400, { error: 'Invite is missing cycle_id (generate student invite with a cycle label)' })
    }

    // Create student record.
    const baseInsert = {
      establishment_id: invite.establishment_id,
      first_name: String(firstName).trim(),
      last_name: String(lastName).trim(),
      date_of_birth: dob,
      email: email ? String(email).trim() : null,
    }

    let studentId = null
    // Try with optional fields (if columns exist), fall back if not.
    const tryInserts = [
      { ...baseInsert, year_group: yearGroup ? String(yearGroup).trim() : null, tutor_group: tutorGroup ? String(tutorGroup).trim() : null },
      baseInsert,
    ]

    let lastError = null
    for (const payload of tryInserts) {
      const { data: student, error } = await supabase.from('lite_students').insert(payload).select('id').single()
      if (!error && student?.id) {
        studentId = student.id
        break
      }
      lastError = error
    }

    if (!studentId) {
      return json(res, 400, { error: lastError?.message || 'Unable to create student' })
    }

    // Create access record (resume token + short resume code).
    const resumeToken = crypto.randomUUID()
    let resumeCode = null

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = makeCode(5)
      const { data: access, error: accessError } = await supabase
        .from('lite_student_access')
        .insert({
          student_id: studentId,
          cycle_id: invite.cycle_id,
          resume_token: resumeToken,
          resume_code: code,
          is_active: true,
        })
        .select('resume_code')
        .single()

      if (!accessError) {
        resumeCode = access?.resume_code || code
        break
      }

      // retry on uniqueness collisions
      const msg = String(accessError.message || '')
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        continue
      }
      return json(res, 400, { error: accessError.message })
    }

    if (!resumeCode) return json(res, 500, { error: 'Unable to allocate resume code (try again)' })

    return json(res, 200, {
      ok: true,
      resumeToken,
      resumeCode,
    })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


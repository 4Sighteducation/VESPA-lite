import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_BASE_URL = 'https://app.vespa.academy' } = process.env

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
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }
  if (!requireEnv(res)) return

  try {
    const { establishmentId, cycleLabel } = req.body || {}
    if (!establishmentId || !cycleLabel) {
      return json(res, 400, { error: 'Missing establishmentId or cycleLabel' })
    }

    const { data: existingCycle } = await supabase
      .from('lite_cycles')
      .select('id')
      .eq('establishment_id', establishmentId)
      .eq('label', cycleLabel)
      .maybeSingle()

    const cycleId = existingCycle?.id
      ? existingCycle.id
      : (
          await supabase
            .from('lite_cycles')
            .insert({ establishment_id: establishmentId, label: cycleLabel })
            .select('id')
            .single()
        ).data.id

    const staffToken = crypto.randomUUID()
    const studentToken = crypto.randomUUID()

    const { error: inviteError } = await supabase.from('lite_school_invites').insert([
      {
        establishment_id: establishmentId,
        cycle_id: cycleId,
        invite_type: 'staff',
        invite_token: staffToken,
        is_active: true,
      },
      {
        establishment_id: establishmentId,
        cycle_id: cycleId,
        invite_type: 'student',
        invite_token: studentToken,
        is_active: true,
      },
    ])

    if (inviteError) {
      return json(res, 400, { error: inviteError.message })
    }

    const staffInviteUrl = `${APP_BASE_URL}/staff/join/${staffToken}`
    const studentInviteUrl = `${APP_BASE_URL}/student/start/${studentToken}`

    return json(res, 200, {
      staffInviteUrl,
      studentInviteUrl,
      cycleId,
      staffToken,
      studentToken,
    })
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Unexpected error' })
  }
}

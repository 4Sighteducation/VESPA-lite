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

async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return { error: 'Missing access token', status: 401 }
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { error: 'Invalid access token', status: 401 }
  }
  return { user: data.user }
}

async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('lite_staff_roles')
    .select('role_type')
    .eq('user_id', userId)
  if (error) {
    return { error }
  }
  const roles = data?.map((row) => row.role_type) || []
  return {
    roles,
    isAdmin: roles.some((role) => role === 'staff_admin' || role === 'super_admin'),
    isSuperAdmin: roles.includes('super_admin'),
  }
}

async function getStaffProfile(userId) {
  const { data, error } = await supabase
    .from('lite_staff_profiles')
    .select('establishment_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    return { error }
  }
  return { profile: data }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }
  if (!requireEnv(res)) return

  const userResult = await getUserFromRequest(req)
  if (userResult.error) {
    return json(res, userResult.status || 401, { error: userResult.error })
  }

  const { user } = userResult
  const { isAdmin, isSuperAdmin, error: roleError } = await getUserRole(user.id)
  if (roleError) {
    return json(res, 500, { error: roleError.message })
  }
  if (!isAdmin) {
    return json(res, 403, { error: 'Not authorised to create invites' })
  }

  try {
    const { establishmentId, cycleLabel, mode = 'both' } = req.body || {}
    if (!establishmentId || !cycleLabel) {
      return json(res, 400, { error: 'Missing establishmentId or cycleLabel' })
    }

    if (!isSuperAdmin) {
      const profileResult = await getStaffProfile(user.id)
      if (profileResult.error) {
        return json(res, 500, { error: profileResult.error.message })
      }
      if (!profileResult.profile || profileResult.profile.establishment_id !== establishmentId) {
        return json(res, 403, { error: 'Establishment mismatch' })
      }
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
    const inviteRows = []
    inviteRows.push({
      establishment_id: establishmentId,
      cycle_id: cycleId,
      invite_type: 'staff',
      invite_token: staffToken,
      is_active: true,
    })
    if (mode !== 'staff_only') {
      inviteRows.push({
        establishment_id: establishmentId,
        cycle_id: cycleId,
        invite_type: 'student',
        invite_token: studentToken,
        is_active: true,
      })
    }

    const { error: inviteError } = await supabase.from('lite_school_invites').insert(inviteRows)

    if (inviteError) {
      return json(res, 400, { error: inviteError.message })
    }

    const staffInviteUrl = `${APP_BASE_URL}/staff/join/${staffToken}`
    const studentInviteUrl = mode !== 'staff_only'
      ? `${APP_BASE_URL}/student/start/${studentToken}`
      : null

    return json(res, 200, {
      staffInviteUrl,
      studentInviteUrl,
      cycleId,
      staffToken,
      studentToken: mode !== 'staff_only' ? studentToken : null,
    })
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Unexpected error' })
  }
}

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }
  if (!requireEnv(res)) return

  const userResult = await getUserFromRequest(req)
  if (userResult.error) {
    return json(res, userResult.status || 401, { error: userResult.error })
  }

  const { user } = userResult

  const { data: profile, error: profileError } = await supabase
    .from('lite_staff_profiles')
    .select('establishment_id, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    return json(res, 500, { error: profileError.message })
  }

  const { data: roles, error: roleError } = await supabase
    .from('lite_staff_roles')
    .select('role_type')
    .eq('user_id', user.id)

  if (roleError) {
    return json(res, 500, { error: roleError.message })
  }

  const roleTypes = roles?.map((row) => row.role_type) || []
  const isSuperAdmin = roleTypes.includes('super_admin')

  const staffName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : user.email

  return json(res, 200, {
    establishmentId: profile?.establishment_id || null,
    staffName,
    roles: roleTypes,
    isSuperAdmin,
  })
}

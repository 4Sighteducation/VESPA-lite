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
  if (!token) return { error: 'Missing access token', status: 401 }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { error: 'Invalid access token', status: 401 }
  return { user: data.user }
}

async function isSuperAdmin(userId) {
  const { data, error } = await supabase.from('lite_staff_roles').select('role_type').eq('user_id', userId)
  if (error) throw error
  return (data || []).some((r) => r.role_type === 'super_admin')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const userResult = await getUserFromRequest(req)
    if (userResult.error) return json(res, userResult.status || 401, { error: userResult.error })
    const ok = await isSuperAdmin(userResult.user.id)
    if (!ok) return json(res, 403, { error: 'Not authorised' })

    const establishmentId = String(req.query?.establishmentId || '').trim()
    if (!establishmentId) return json(res, 400, { error: 'Missing establishmentId' })

    const { data: profiles, error: profileError } = await supabase
      .from('lite_staff_profiles')
      .select('user_id, email, first_name, last_name, created_at')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (profileError) return json(res, 400, { error: profileError.message })

    const userIds = (profiles || []).map((p) => p.user_id)
    const { data: roles, error: roleError } = await supabase
      .from('lite_staff_roles')
      .select('user_id, role_type')
      .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

    if (roleError) return json(res, 400, { error: roleError.message })
    const roleMap = new Map()
    for (const r of roles || []) {
      const arr = roleMap.get(r.user_id) || []
      arr.push(r.role_type)
      roleMap.set(r.user_id, arr)
    }

    const staff = (profiles || []).map((p) => ({
      ...p,
      roles: roleMap.get(p.user_id) || [],
    }))

    return json(res, 200, { staff })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


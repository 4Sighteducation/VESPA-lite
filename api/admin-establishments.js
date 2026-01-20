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

    const { data, error } = await supabase
      .from('establishments')
      .select('id, name, centre_number, primary_contact_email, created_at, account_type, addons')
      .eq('account_type', 'VESPA_LITE')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) return json(res, 400, { error: error.message })
    return json(res, 200, { establishments: data || [] })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


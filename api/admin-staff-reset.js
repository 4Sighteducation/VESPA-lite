import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'
import crypto from 'crypto'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SENDGRID_API_KEY,
  ORG_WELCOME_TEMPLATE_ID,
  APP_BASE_URL = 'https://app.vespa.academy',
} = process.env

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
  if (!SENDGRID_API_KEY) missing.push('SENDGRID_API_KEY')
  if (!ORG_WELCOME_TEMPLATE_ID) missing.push('ORG_WELCOME_TEMPLATE_ID')
  if (missing.length) {
    json(res, 500, { error: `Missing env vars: ${missing.join(', ')}` })
    return false
  }
  return true
}

function randomPassword() {
  return crypto.randomBytes(12).toString('base64url')
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
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!requireEnv(res)) return

  try {
    const userResult = await getUserFromRequest(req)
    if (userResult.error) return json(res, userResult.status || 401, { error: userResult.error })
    const ok = await isSuperAdmin(userResult.user.id)
    if (!ok) return json(res, 403, { error: 'Not authorised' })

    const userId = String(req.body?.userId || '').trim()
    if (!userId) return json(res, 400, { error: 'Missing userId' })

    const { data: profile, error: profileError } = await supabase
      .from('lite_staff_profiles')
      .select('user_id, establishment_id, email, first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle()
    if (profileError) return json(res, 400, { error: profileError.message })
    if (!profile) return json(res, 404, { error: 'Staff profile not found' })

    const { data: est, error: estError } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('id', profile.establishment_id)
      .maybeSingle()
    if (estError) return json(res, 400, { error: estError.message })

    const { data: roles, error: roleError } = await supabase
      .from('lite_staff_roles')
      .select('role_type')
      .eq('user_id', profile.user_id)
    if (roleError) return json(res, 400, { error: roleError.message })

    const roleTypes = (roles || []).map((r) => r.role_type)
    const isAdmin = roleTypes.includes('staff_admin') || roleTypes.includes('super_admin')

    const password = randomPassword()

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    })
    if (updateError) return json(res, 400, { error: updateError.message })

    sgMail.setApiKey(SENDGRID_API_KEY)
    await sgMail.send({
      to: profile.email,
      from: 'support@vespa.academy',
      templateId: ORG_WELCOME_TEMPLATE_ID,
      dynamicTemplateData: {
        organisationName: est?.name || 'your school',
        loginUrl: `${APP_BASE_URL}/login`,
        password,
        loginEmail: profile.email,
        greetingName: profile.first_name || '',
        supportEmail: 'support@vespa.academy',
        ssoMessage: 'You can also sign in using Google or Microsoft on the login page.',
        isAdmin,
      },
    })

    return json(res, 200, { ok: true })
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Unexpected error' })
  }
}


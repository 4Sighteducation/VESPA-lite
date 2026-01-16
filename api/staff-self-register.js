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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }
  if (!requireEnv(res)) return

  const {
    inviteToken,
    email,
    firstName,
    lastName,
    roleType,
    tutorGroup,
    yearGroup,
    subject,
  } = req.body || {}

  if (!inviteToken || !email || !firstName || !lastName || !roleType) {
    return json(res, 400, { error: 'Missing required fields' })
  }

  const { data: invite, error: inviteError } = await supabase
    .from('lite_school_invites')
    .select('establishment_id, cycle_id, invite_type, is_active')
    .eq('invite_token', inviteToken)
    .eq('invite_type', 'staff')
    .maybeSingle()

  if (inviteError || !invite || !invite.is_active) {
    return json(res, 400, { error: 'Invalid or inactive invite token' })
  }

  const { data: establishment, error: establishmentError } = await supabase
    .from('establishments')
    .select('id, name')
    .eq('id', invite.establishment_id)
    .single()

  if (establishmentError) {
    return json(res, 400, { error: 'Invalid establishment' })
  }

  const password = randomPassword()
  const fullName = `${firstName} ${lastName}`.trim()
  const roleMeta = {
    tutor_group: tutorGroup || null,
    year_group: yearGroup || null,
    subject: subject || null,
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      establishment_id: establishment.id,
    },
  })

  if (userError) {
    return json(res, 400, { error: userError.message })
  }

  const userId = userData?.user?.id
  if (!userId) {
    return json(res, 400, { error: 'User creation failed' })
  }

  const { error: profileError } = await supabase.from('lite_staff_profiles').insert({
    user_id: userId,
    establishment_id: establishment.id,
    email,
    first_name: firstName,
    last_name: lastName,
  })
  if (profileError) {
    return json(res, 400, { error: profileError.message })
  }

  const { error: roleError } = await supabase.from('lite_staff_roles').insert({
    user_id: userId,
    role_type: roleType,
    role_meta: roleMeta,
  })
  if (roleError) {
    return json(res, 400, { error: roleError.message })
  }

  await supabase.from('lite_staff_invites').insert({
    establishment_id: establishment.id,
    invited_by_user_id: null,
    invite_method: 'qr',
    invite_token: inviteToken,
    email,
    first_name: firstName,
    last_name: lastName,
    role_type: roleType,
    role_meta: roleMeta,
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  })

  sgMail.setApiKey(SENDGRID_API_KEY)
  try {
    await sgMail.send({
      to: email,
      from: 'support@vespa.academy',
      templateId: ORG_WELCOME_TEMPLATE_ID,
      dynamicTemplateData: {
        organisationName: establishment.name,
        loginUrl: `${APP_BASE_URL}/login`,
        password,
        loginEmail: email,
        primaryContactFirstName: firstName,
        greetingName: firstName,
        supportEmail: 'support@vespa.academy',
        ssoMessage: 'You can also sign in using Google or Microsoft on the login page.',
        isAdmin: roleType === 'staff_admin' || roleType === 'super_admin',
      },
    })
  } catch (emailError) {
    return json(res, 500, { error: emailError?.message || 'SendGrid error' })
  }

  return json(res, 200, { ok: true })
}

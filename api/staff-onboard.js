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
    .select('establishment_id, first_name, last_name')
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
  const { roles, isAdmin, isSuperAdmin, error: roleError } = await getUserRole(user.id)
  if (roleError) {
    return json(res, 500, { error: roleError.message })
  }
  if (!isAdmin) {
    return json(res, 403, { error: 'Not authorised to add staff' })
  }

  const { establishmentId, inviteMethod, staff, sendWelcomeEmail } = req.body || {}
  if (!establishmentId || !Array.isArray(staff) || !inviteMethod) {
    return json(res, 400, { error: 'Missing establishmentId, staff list, or inviteMethod' })
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

  const { data: establishment, error: establishmentError } = await supabase
    .from('establishments')
    .select('id, name')
    .eq('id', establishmentId)
    .single()

  if (establishmentError) {
    return json(res, 400, { error: 'Invalid establishment ID' })
  }

  sgMail.setApiKey(SENDGRID_API_KEY)
  const loginUrl = `${APP_BASE_URL}/login`

  const created = []
  const failed = []

  for (const staffMember of staff) {
    const email = staffMember.email?.trim()
    const firstName = staffMember.firstName?.trim()
    const lastName = staffMember.lastName?.trim()
    const roleType = staffMember.roleType?.trim()

    if (!email || !roleType || !firstName || !lastName) {
      failed.push({ email: email || '(missing)', error: 'Missing required fields' })
      continue
    }

    const password = randomPassword()
    const fullName = `${firstName} ${lastName}`.trim()
    const roleMeta = {
      tutor_group: staffMember.tutorGroup || null,
      year_group: staffMember.yearGroup || null,
      subject: staffMember.subject || null,
    }

    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        establishment_id: establishment.id,
      },
    })

    if (createUserError) {
      failed.push({ email, error: createUserError.message })
      continue
    }

    const userId = userData?.user?.id
    if (!userId) {
      failed.push({ email, error: 'User creation failed' })
      continue
    }

    const { error: profileError } = await supabase.from('lite_staff_profiles').insert({
      user_id: userId,
      establishment_id: establishment.id,
      email,
      first_name: firstName,
      last_name: lastName,
    })
    if (profileError) {
      failed.push({ email, error: profileError.message })
      continue
    }

    const { error: roleInsertError } = await supabase.from('lite_staff_roles').insert({
      user_id: userId,
      role_type: roleType,
      role_meta: roleMeta,
    })
    if (roleInsertError) {
      failed.push({ email, error: roleInsertError.message })
      continue
    }

    const inviteToken = crypto.randomUUID()
    await supabase.from('lite_staff_invites').insert({
      establishment_id: establishment.id,
      invited_by_user_id: user.id,
      invite_method: inviteMethod,
      invite_token: inviteToken,
      email,
      first_name: firstName,
      last_name: lastName,
      role_type: roleType,
      role_meta: roleMeta,
      status: 'sent',
    })

    if (sendWelcomeEmail) {
      try {
        await sgMail.send({
          to: email,
          from: 'support@vespa.academy',
          templateId: ORG_WELCOME_TEMPLATE_ID,
          dynamicTemplateData: {
            organisationName: establishment.name,
            loginUrl,
            password,
            loginEmail: email,
            primaryContactLastName: lastName,
            supportEmail: 'support@vespa.academy',
            ssoMessage: 'You can also sign in using Google or Microsoft on the login page.',
          },
        })
      } catch (emailError) {
        failed.push({ email, error: emailError?.message || 'SendGrid error' })
        continue
      }
    }

    created.push({ email, userId })
  }

  return json(res, 200, { created, failed, roles })
}

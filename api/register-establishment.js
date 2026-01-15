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

  try {
    const {
      organisationName,
      schoolUrn,
      address,
      phoneNumber,
      primaryContactName,
      primaryContactEmail,
      financeContactName,
      financeContactEmail,
      studentAccountsLimit,
      staffAccountsLimit,
      logoUrl,
    } = req.body || {}

    if (!organisationName || !schoolUrn || !primaryContactName || !primaryContactEmail) {
      return json(res, 400, { error: 'Missing required fields' })
    }

    const password = randomPassword()
    const loginUrl = `${APP_BASE_URL}/login`
    const knackId = `lite_${crypto.randomUUID()}`

    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .insert({
        knack_id: knackId,
        name: organisationName,
        status: 'Active',
        centre_number: schoolUrn,
        address: address || null,
        phone_number: phoneNumber || null,
        primary_contact_name: primaryContactName,
        primary_contact_email: primaryContactEmail,
        finance_contact_name: financeContactName || null,
        finance_contact_email: financeContactEmail || null,
        student_accounts_limit: Number(studentAccountsLimit || 0),
        staff_accounts_limit: Number(staffAccountsLimit || 0),
        addons: ['lite'],
        account_type: 'VESPA_LITE',
        logo_url: logoUrl || null,
      })
      .select()
      .single()

    if (estError) {
      return json(res, 400, { error: estError.message })
    }

    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: primaryContactEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: primaryContactName,
        establishment_id: establishment.id,
      },
    })

    if (userError) {
      return json(res, 400, { error: userError.message })
    }

    const userId = user.user?.id
    if (userId) {
      await supabase.from('lite_staff_profiles').insert({
        user_id: userId,
        establishment_id: establishment.id,
        email: primaryContactEmail,
        first_name: primaryContactName.split(' ')[0] || primaryContactName,
        last_name: primaryContactName.split(' ').slice(1).join(' ') || null,
      })
      await supabase.from('lite_staff_roles').insert({
        user_id: userId,
        role_type: 'staff_admin',
        role_meta: { source: 'lite-registration' },
      })
    }

    sgMail.setApiKey(SENDGRID_API_KEY)
    await sgMail.send({
      to: primaryContactEmail,
      from: 'support@vespa.academy',
      templateId: ORG_WELCOME_TEMPLATE_ID,
      dynamicTemplateData: {
        organisationName,
        loginUrl,
        password,
        loginEmail: primaryContactEmail,
        supportEmail: 'support@vespa.academy',
        ssoMessage: 'You can also sign in using Google or Microsoft on the login page.',
      },
    })

    return json(res, 200, { ok: true, loginUrl })
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Unexpected error' })
  }
}

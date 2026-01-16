import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type StaffInput = {
  email: string
  firstName: string
  lastName: string
  roleType: string
  tutorGroup?: string
  yearGroup?: string
  subject?: string
}

type StaffOnboardResult = {
  created: Array<{ email: string; userId: string }>
  failed: Array<{ email: string; error: string }>
}

type WizardStep = 'manual' | 'csv' | 'qr'

const roleOptions = [
  { value: 'tutor', label: 'Tutor' },
  { value: 'head_of_year', label: 'Head of Year' },
  { value: 'subject_teacher', label: 'Subject Teacher' },
  { value: 'head_of_department', label: 'Head of Department' },
  { value: 'staff_admin', label: 'Staff Admin' },
]

const StaffAdmin = () => {
  const [establishmentId, setEstablishmentId] = useState('')
  const [cycleLabel, setCycleLabel] = useState('Spring Pilot')
  const [activeStep, setActiveStep] = useState<WizardStep>('manual')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [profileMessage, setProfileMessage] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffForm, setStaffForm] = useState<StaffInput>({
    email: '',
    firstName: '',
    lastName: '',
    roleType: 'tutor',
    tutorGroup: '',
    yearGroup: '',
    subject: '',
  })
  const [csvPreview, setCsvPreview] = useState<StaffInput[]>([])
  const [csvMessage, setCsvMessage] = useState('')
  const [onboardResult, setOnboardResult] = useState<StaffOnboardResult | null>(null)
  const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [qrMessage, setQrMessage] = useState('')
  const [staffInviteUrl, setStaffInviteUrl] = useState('')
  const [studentInviteUrl, setStudentInviteUrl] = useState('')

  const staffTemplateCsv = useMemo(() => {
    return [
      'email,first_name,last_name,role_type,tutor_group,year_group,subject',
      'jane.smith@school.org,Jane,Smith,tutor,12A,Year 12,',
      'm.tutor@school.org,Martin,Tutor,head_of_year,,Year 11,',
    ].join('\n')
  }, [])

  const downloadTemplate = () => {
    const blob = new Blob([staffTemplateCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'vespa-lite-staff-template.csv')
    link.click()
    URL.revokeObjectURL(url)
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  const parseCsv = async (file: File) => {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV needs a header row and at least one staff row.')
    }

    const parseLine = (line: string) => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i += 1
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseLine(lines[0]).map((header) => header.toLowerCase())
    const requiredHeaders = ['email', 'first_name', 'last_name', 'role_type']
    const missing = requiredHeaders.filter((header) => !headers.includes(header))
    if (missing.length) {
      throw new Error(`Missing columns: ${missing.join(', ')}`)
    }

    const staffRows = lines.slice(1).map((line) => {
      const values = parseLine(line)
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      return {
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        roleType: row.role_type,
        tutorGroup: row.tutor_group,
        yearGroup: row.year_group,
        subject: row.subject,
      } as StaffInput
    })

    return staffRows.filter((row) => row.email && row.roleType)
  }

  const submitStaff = async (staff: StaffInput[], inviteMethod: 'manual' | 'csv') => {
    const token = await getAccessToken()
    if (!token) {
      setStatus('error')
      setErrorMessage('Log in to upload staff.')
      return
    }
    if (!establishmentId) {
      setStatus('error')
      setErrorMessage('Enter an establishment ID first.')
      return
    }
    setStatus('loading')
    setErrorMessage('')
    setOnboardResult(null)
    try {
      const response = await fetch('/api/staff-onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          establishmentId,
          inviteMethod,
          sendWelcomeEmail: true,
          staff,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to add staff')
      }
      setOnboardResult(payload)
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add staff')
    }
  }

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await submitStaff([staffForm], 'manual')
  }

  const handleCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseCsv(file)
      setCsvPreview(rows)
      setCsvMessage(`${rows.length} staff rows ready to upload.`)
    } catch (error) {
      setCsvPreview([])
      setCsvMessage(error instanceof Error ? error.message : 'Unable to parse CSV.')
    }
  }

  const handleCsvSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!csvPreview.length) {
      setCsvMessage('Upload a CSV file first.')
      return
    }
    await submitStaff(csvPreview, 'csv')
  }

  const generateQrInvite = async () => {
    const token = await getAccessToken()
    if (!token) {
      setQrStatus('error')
      setQrMessage('Log in to generate QR invites.')
      return
    }
    if (!establishmentId) {
      setQrStatus('error')
      setQrMessage('Enter an establishment ID first.')
      return
    }
    setQrStatus('loading')
    setQrMessage('')
    setStaffInviteUrl('')
    setStudentInviteUrl('')

    try {
      const response = await fetch('/api/create-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ establishmentId, cycleLabel, mode: 'staff_only' }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create staff invite link')
      }
      setStaffInviteUrl(payload.staffInviteUrl)
      if (payload.studentInviteUrl) {
        setStudentInviteUrl(payload.studentInviteUrl)
      }
      setQrStatus('idle')
    } catch (error) {
      setQrStatus('error')
      setQrMessage(error instanceof Error ? error.message : 'Unable to create staff invite link')
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setProfileStatus('loading')
      setProfileMessage('')

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (cancelled) return

      if (authError || !authData?.user) {
        setProfileStatus('error')
        setProfileMessage('Log in to auto-fill your establishment ID.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('lite_staff_profiles')
        .select('establishment_id, first_name, last_name')
        .eq('user_id', authData.user.id)
        .maybeSingle()

      if (cancelled) return

      if (profileError || !profile) {
        setProfileStatus('error')
        setProfileMessage('Unable to load staff profile. You can paste the ID manually.')
        return
      }

      setEstablishmentId(profile.establishment_id || '')
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      setStaffName(fullName || authData.user.email || '')
      setProfileStatus('idle')
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="panel">
      <span className="pill">Account Management</span>
      <h1>Staff Onboarding Wizard</h1>
      <p>Step 1: add staff so they can access reports. Step 2: share a staff QR invite link.</p>
      {staffName && <p className="success">Signed in as {staffName}</p>}
      {profileStatus === 'error' && <p className="error">{profileMessage}</p>}

      <div className="wizard-steps">
        <button
          className={activeStep === 'manual' ? 'wizard-step active' : 'wizard-step'}
          type="button"
          onClick={() => setActiveStep('manual')}
        >
          1. Add staff individually
        </button>
        <button
          className={activeStep === 'csv' ? 'wizard-step active' : 'wizard-step'}
          type="button"
          onClick={() => setActiveStep('csv')}
        >
          2. Upload CSV
        </button>
        <button
          className={activeStep === 'qr' ? 'wizard-step active' : 'wizard-step'}
          type="button"
          onClick={() => setActiveStep('qr')}
        >
          3. Share QR invite
        </button>
      </div>

      <div className="wizard-panel">
        <label className="wizard-label">
          Establishment ID
          <input
            required
            value={establishmentId}
            onChange={(e) => setEstablishmentId(e.target.value)}
            placeholder="Paste establishment UUID"
          />
        </label>
        <p className="wizard-help">
          This is auto-filled for staff admins. Super admins can override to target another school.
        </p>
      </div>

      {activeStep === 'manual' && (
        <form className="form" onSubmit={handleManualSubmit}>
          <div className="form-grid">
            <label>
              First name
              <input
                required
                value={staffForm.firstName}
                onChange={(event) => setStaffForm({ ...staffForm, firstName: event.target.value })}
                placeholder="First name"
              />
            </label>
            <label>
              Last name
              <input
                required
                value={staffForm.lastName}
                onChange={(event) => setStaffForm({ ...staffForm, lastName: event.target.value })}
                placeholder="Last name"
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={staffForm.email}
                onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })}
                placeholder="name@school.org"
              />
            </label>
            <label>
              Role
              <select
                value={staffForm.roleType}
                onChange={(event) => setStaffForm({ ...staffForm, roleType: event.target.value })}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tutor group
              <input
                value={staffForm.tutorGroup}
                onChange={(event) => setStaffForm({ ...staffForm, tutorGroup: event.target.value })}
                placeholder="e.g. 12A"
              />
            </label>
            <label>
              Year group
              <input
                value={staffForm.yearGroup}
                onChange={(event) => setStaffForm({ ...staffForm, yearGroup: event.target.value })}
                placeholder="e.g. Year 12"
              />
            </label>
            <label>
              Subject
              <input
                value={staffForm.subject}
                onChange={(event) => setStaffForm({ ...staffForm, subject: event.target.value })}
                placeholder="e.g. English"
              />
            </label>
          </div>
          <button className="primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Adding staff…' : 'Add staff and send welcome email'}
          </button>
          {status === 'error' && <p className="error">Error: {errorMessage}</p>}
        </form>
      )}

      {activeStep === 'csv' && (
        <form className="form" onSubmit={handleCsvSubmit}>
          <div className="wizard-panel">
            <p className="wizard-help">
              Upload a CSV file with columns: email, first_name, last_name, role_type,
              tutor_group, year_group, subject.
            </p>
            <div className="wizard-actions">
              <button className="secondary" type="button" onClick={downloadTemplate}>
                Download CSV template
              </button>
              <label className="file-upload">
                Upload CSV
                <input type="file" accept=".csv" onChange={handleCsvFile} />
              </label>
            </div>
            {csvMessage && <p className="success">{csvMessage}</p>}
          </div>
          <button className="primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Uploading…' : 'Upload CSV and send welcome emails'}
          </button>
          {status === 'error' && <p className="error">Error: {errorMessage}</p>}
        </form>
      )}

      {activeStep === 'qr' && (
        <div className="form">
          <div className="wizard-panel">
            <label className="wizard-label">
              Cycle label (for staff QR)
              <input
                value={cycleLabel}
                onChange={(e) => setCycleLabel(e.target.value)}
                placeholder="Spring Pilot"
              />
            </label>
            <button className="primary" type="button" onClick={generateQrInvite} disabled={qrStatus === 'loading'}>
              {qrStatus === 'loading' ? 'Generating…' : 'Generate staff QR link'}
            </button>
            {qrStatus === 'error' && <p className="error">Error: {qrMessage}</p>}
          </div>
          {staffInviteUrl && (
            <div className="invite-output">
              <h3>Staff invite link</h3>
              <div className="invite-row">
                <span>Staff invite</span>
                <a href={staffInviteUrl}>{staffInviteUrl}</a>
              </div>
              <div className="invite-row">
                <span>QR code</span>
                <img
                  className="qr-image"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(staffInviteUrl)}`}
                  alt="Staff invite QR"
                />
              </div>
            </div>
          )}
          {studentInviteUrl && (
            <div className="invite-output">
              <h3>Student invite link</h3>
              <div className="invite-row">
                <span>Student invite</span>
                <a href={studentInviteUrl}>{studentInviteUrl}</a>
              </div>
            </div>
          )}
        </div>
      )}

      {onboardResult && (
        <div className="invite-output">
          <h3>Upload summary</h3>
          <div className="invite-meta">
            <span>Created: {onboardResult.created.length}</span>
            <span>Failed: {onboardResult.failed.length}</span>
          </div>
          {onboardResult.failed.length > 0 && (
            <div className="invite-meta">
              {onboardResult.failed.slice(0, 5).map((fail) => (
                <span key={fail.email}>{fail.email}: {fail.error}</span>
              ))}
              {onboardResult.failed.length > 5 && (
                <span>…and {onboardResult.failed.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StaffAdmin

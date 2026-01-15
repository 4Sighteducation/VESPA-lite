import { Link } from 'react-router-dom'
import { useState } from 'react'

type RegistrationPayload = {
  organisationName: string
  schoolUrn: string
  address: string
  phoneNumber: string
  primaryContactName: string
  primaryContactEmail: string
  financeContactName: string
  financeContactEmail: string
  studentAccountsLimit: string
  staffAccountsLimit: string
  logoUrl: string
}

type RegistrationStatus =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'success'; loginUrl: string }
  | { state: 'error'; message: string }

const Home = () => {
  const [form, setForm] = useState<RegistrationPayload>({
    organisationName: '',
    schoolUrn: '',
    address: '',
    phoneNumber: '',
    primaryContactName: '',
    primaryContactEmail: '',
    financeContactName: '',
    financeContactEmail: '',
    studentAccountsLimit: '',
    staffAccountsLimit: '',
    logoUrl: '',
  })
  const [status, setStatus] = useState<RegistrationStatus>({ state: 'idle' })

  const updateField = (field: keyof RegistrationPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const submitRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ state: 'submitting' })
    try {
      const response = await fetch('/api/register-establishment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Registration failed')
      }
      setStatus({ state: 'success', loginUrl: payload.loginUrl || '/login' })
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Registration failed',
      })
    }
  }

  return (
    <div className="panel">
      <span className="pill">VESPA Lite • Pilot</span>
      <h1>Welcome to VESPA Lite</h1>
      <p>
        This pilot provides the questionnaire, coaching report, and staff feedback tools.
        Student registration and staff onboarding are managed via school-specific links.
      </p>
      <div className="grid">
        <div className="card">
          <h3>Student Registration</h3>
          <p>Start the questionnaire from a school invite link.</p>
          <Link to="/student/start/demo">Open student start page</Link>
        </div>
        <div className="card">
          <h3>Resume</h3>
          <p>Resume with a code and date of birth on any device.</p>
          <Link to="/resume">Resume questionnaire</Link>
        </div>
        <div className="card">
          <h3>Staff Onboarding</h3>
          <p>Staff join via a school invite token to access reports.</p>
          <Link to="/staff/join/demo">Open staff join page</Link>
        </div>
        <div className="card">
          <h3>Staff Portal</h3>
          <p>View linked students and coaching reports.</p>
          <Link to="/staff">Open staff portal</Link>
        </div>
      </div>

      <section className="section">
        <h2>Register a School (Admin)</h2>
        <p>Complete this form to create the organisation and receive the welcome email.</p>
        <form className="form" onSubmit={submitRegistration}>
          <div className="form-grid">
            <label>
              Organisation name
              <input
                required
                value={form.organisationName}
                onChange={(e) => updateField('organisationName', e.target.value)}
                placeholder="School name"
              />
            </label>
            <label>
              School URN / Centre number
              <input
                required
                value={form.schoolUrn}
                onChange={(e) => updateField('schoolUrn', e.target.value)}
                placeholder="URN / Centre number"
              />
            </label>
            <label>
              Primary contact name
              <input
                required
                value={form.primaryContactName}
                onChange={(e) => updateField('primaryContactName', e.target.value)}
                placeholder="Full name"
              />
            </label>
            <label>
              Primary contact email
              <input
                required
                type="email"
                value={form.primaryContactEmail}
                onChange={(e) => updateField('primaryContactEmail', e.target.value)}
                placeholder="name@school.org"
              />
            </label>
            <label>
              Phone number
              <input
                required
                value={form.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                placeholder="+44 ..."
              />
            </label>
            <label>
              Address
              <input
                required
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="School address"
              />
            </label>
            <label>
              Finance contact name
              <input
                value={form.financeContactName}
                onChange={(e) => updateField('financeContactName', e.target.value)}
                placeholder="(optional)"
              />
            </label>
            <label>
              Finance contact email
              <input
                type="email"
                value={form.financeContactEmail}
                onChange={(e) => updateField('financeContactEmail', e.target.value)}
                placeholder="(optional)"
              />
            </label>
            <label>
              Student accounts limit
              <input
                required
                type="number"
                min="1"
                value={form.studentAccountsLimit}
                onChange={(e) => updateField('studentAccountsLimit', e.target.value)}
                placeholder="e.g. 500"
              />
            </label>
            <label>
              Staff accounts limit
              <input
                required
                type="number"
                min="1"
                value={form.staffAccountsLimit}
                onChange={(e) => updateField('staffAccountsLimit', e.target.value)}
                placeholder="e.g. 50"
              />
            </label>
            <label className="form-span">
              Logo URL
              <input
                value={form.logoUrl}
                onChange={(e) => updateField('logoUrl', e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>
          <button className="primary" type="submit" disabled={status.state === 'submitting'}>
            {status.state === 'submitting' ? 'Registering…' : 'Register organisation'}
          </button>
          {status.state === 'success' && (
            <p className="success">
              Registration complete. Welcome email sent. Login URL: <a href={status.loginUrl}>{status.loginUrl}</a>
            </p>
          )}
          {status.state === 'error' && <p className="error">Error: {status.message}</p>}
        </form>
      </section>
    </div>
  )
}

export default Home

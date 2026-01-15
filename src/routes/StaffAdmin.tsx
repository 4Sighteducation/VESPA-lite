import { useState } from 'react'

type InviteResult = {
  staffInviteUrl: string
  studentInviteUrl: string
  cycleId: string
  staffToken: string
  studentToken: string
}

const StaffAdmin = () => {
  const [establishmentId, setEstablishmentId] = useState('')
  const [cycleLabel, setCycleLabel] = useState('Spring Pilot')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<InviteResult | null>(null)

  const generateInvites = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    setResult(null)

    try {
      const response = await fetch('/api/create-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId, cycleLabel }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create invites')
      }
      setResult(payload)
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create invites')
    }
  }

  return (
    <div className="panel">
      <span className="pill">Account Management</span>
      <h1>Staff Admin Controls</h1>
      <p>Create QR links for staff onboarding and student registration.</p>

      <form className="form" onSubmit={generateInvites}>
        <div className="form-grid">
          <label>
            Establishment ID
            <input
              required
              value={establishmentId}
              onChange={(e) => setEstablishmentId(e.target.value)}
              placeholder="Paste establishment UUID"
            />
          </label>
          <label>
            Cycle label
            <input
              required
              value={cycleLabel}
              onChange={(e) => setCycleLabel(e.target.value)}
              placeholder="Spring Pilot"
            />
          </label>
        </div>
        <button className="primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Generating…' : 'Generate Staff + Student QR links'}
        </button>
        {status === 'error' && <p className="error">Error: {errorMessage}</p>}
      </form>

      {result && (
        <div className="invite-output">
          <h3>Invite links</h3>
          <div className="invite-row">
            <span>Staff invite</span>
            <a href={result.staffInviteUrl}>{result.staffInviteUrl}</a>
          </div>
          <div className="invite-row">
            <span>Student invite</span>
            <a href={result.studentInviteUrl}>{result.studentInviteUrl}</a>
          </div>
          <div className="invite-meta">
            <span>Cycle ID: {result.cycleId}</span>
            <span>Staff token: {result.staffToken}</span>
            <span>Student token: {result.studentToken}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffAdmin

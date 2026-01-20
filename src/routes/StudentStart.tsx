import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type Context =
  | { mode: 'loading' }
  | { mode: 'demo' }
  | { mode: 'invite'; inviteToken: string; establishmentName?: string | null; logoUrl?: string | null }
  | { mode: 'resume'; resumeToken: string; resumeCode?: string | null; student?: { firstName: string; lastName: string } | null }
  | { mode: 'error'; message: string }

function toIsoDate(input: string) {
  const raw = (input || '').trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    const yyyy = m[3]
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

export default function StudentStart() {
  const { token } = useParams()
  const t = (token || '').trim() || 'demo'

  const [ctx, setCtx] = useState<Context>({ mode: 'loading' })
  const [reg, setReg] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    yearGroup: '',
    tutorGroup: '',
  })
  const [regStatus, setRegStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [regMessage, setRegMessage] = useState('')
  const [createdResumeCode, setCreatedResumeCode] = useState<string | null>(null)
  const [createdResumeToken, setCreatedResumeToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setCtx({ mode: 'loading' })
        const r = await fetch(`/api/student-start-context?token=${encodeURIComponent(t)}`)
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error || 'Unable to load student link')
        if (cancelled) return

        if (data?.mode === 'demo') setCtx({ mode: 'demo' })
        else if (data?.mode === 'invite')
          setCtx({ mode: 'invite', inviteToken: data.inviteToken, establishmentName: data.establishmentName, logoUrl: data.logoUrl })
        else if (data?.mode === 'resume')
          setCtx({ mode: 'resume', resumeToken: data.resumeToken, resumeCode: data.resumeCode, student: data.student || null })
        else setCtx({ mode: 'error', message: 'Unexpected response.' })
      } catch (e: any) {
        if (!cancelled) setCtx({ mode: 'error', message: e?.message || 'Unable to load' })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [t])

  const questionnaireLink = useMemo(() => `/student/questionnaire/${encodeURIComponent(t)}`, [t])
  const reportLink = useMemo(() => `/student/report/${encodeURIComponent(t)}`, [t])

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ctx.mode !== 'invite') return
    const dob = toIsoDate(reg.dateOfBirth)
    if (!dob) {
      setRegStatus('error')
      setRegMessage('Enter DOB as DD/MM/YYYY or YYYY-MM-DD.')
      return
    }

    setRegStatus('loading')
    setRegMessage('')
    try {
      const r = await fetch('/api/student-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteToken: ctx.inviteToken,
          firstName: reg.firstName,
          lastName: reg.lastName,
          dateOfBirth: dob,
          email: reg.email || null,
          yearGroup: reg.yearGroup || null,
          tutorGroup: reg.tutorGroup || null,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Unable to register')
      setCreatedResumeCode(data.resumeCode || null)
      setCreatedResumeToken(data.resumeToken || null)
      setRegStatus('success')
      setRegMessage('Registration complete. Save your resume code!')
    } catch (err: any) {
      setRegStatus('error')
      setRegMessage(err?.message || 'Unable to register')
    }
  }

  const goWithCreatedToken = () => {
    if (!createdResumeToken) return
    window.location.assign(`/student/start/${encodeURIComponent(createdResumeToken)}`)
  }

  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }

  if (ctx.mode === 'loading') {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
        <div style={cardStyle}>Loading…</div>
      </div>
    )
  }

  if (ctx.mode === 'error') {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
        <div style={cardStyle}>
          <h1 style={{ margin: '0 0 6px' }}>Not available</h1>
          <p style={{ margin: 0, color: '#666' }}>{ctx.message}</p>
          <p style={{ marginTop: 12 }}>
            You can try the resume page: <Link to="/student/access">Student access</Link>
          </p>
        </div>
      </div>
    )
  }

  if (ctx.mode === 'invite') {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
        <div style={cardStyle}>
          <span style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: 'rgba(7,155,170,0.08)', color: '#079baa', fontWeight: 700 }}>
            Student
          </span>
          <h1 style={{ margin: '12px 0 6px' }}>First time setup</h1>
          <p style={{ margin: 0, color: '#555' }}>
            {ctx.establishmentName ? <>School: <strong>{ctx.establishmentName}</strong></> : 'Complete this registration to get your resume code.'}
          </p>

          <div style={{ marginTop: 16, padding: 16, borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)' }}>
            <form onSubmit={submitRegistration} className="form">
              <div className="form-grid">
                <label>
                  First name
                  <input value={reg.firstName} onChange={(ev) => setReg((p) => ({ ...p, firstName: ev.target.value }))} required />
                </label>
                <label>
                  Last name
                  <input value={reg.lastName} onChange={(ev) => setReg((p) => ({ ...p, lastName: ev.target.value }))} required />
                </label>
                <label>
                  Date of birth
                  <input value={reg.dateOfBirth} onChange={(ev) => setReg((p) => ({ ...p, dateOfBirth: ev.target.value }))} placeholder="DD/MM/YYYY" required />
                </label>
                <label>
                  Year group (optional)
                  <input value={reg.yearGroup} onChange={(ev) => setReg((p) => ({ ...p, yearGroup: ev.target.value }))} placeholder="e.g. 12" />
                </label>
                <label>
                  Tutor group (optional)
                  <input value={reg.tutorGroup} onChange={(ev) => setReg((p) => ({ ...p, tutorGroup: ev.target.value }))} placeholder="e.g. 12A" />
                </label>
                <label className="form-span">
                  School email (optional)
                  <input value={reg.email} onChange={(ev) => setReg((p) => ({ ...p, email: ev.target.value }))} type="email" placeholder="name@school.org" />
                </label>
              </div>

              <button className="primary" type="submit" disabled={regStatus === 'loading'}>
                {regStatus === 'loading' ? 'Creating…' : 'Create my resume code'}
              </button>

              {regStatus === 'error' ? <p className="error">Error: {regMessage}</p> : null}
              {regStatus === 'success' ? (
                <div className="success" style={{ marginTop: 10 }}>
                  <p style={{ margin: 0 }}>{regMessage}</p>
                  <p style={{ margin: '10px 0 0' }}>
                    Your resume code: <strong>{createdResumeCode}</strong>
                  </p>
                  <button type="button" className="secondary" style={{ marginTop: 10 }} onClick={goWithCreatedToken}>
                    Continue to questionnaire
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    )
  }

  // demo or resume mode: launcher
  const heading = ctx.mode === 'resume' && ctx.student ? `Welcome, ${ctx.student.firstName}` : 'Welcome to VESPA'
  const resumeInfo =
    ctx.mode === 'resume' ? (
      <p style={{ margin: '10px 0 0', color: '#555' }}>
        Resume code: <code>{ctx.resumeCode || '—'}</code>
      </p>
    ) : null

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
      <div style={cardStyle}>
        <span style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: 'rgba(7,155,170,0.08)', color: '#079baa', fontWeight: 700 }}>
          Student
        </span>
        <h1 style={{ margin: '12px 0 6px' }}>{heading}</h1>
        {resumeInfo}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
          <Link
            to={questionnaireLink}
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.08)',
              textDecoration: 'none',
              color: '#111',
            }}
          >
            <strong>Start Questionnaire</strong>
            <div style={{ marginTop: 6, color: '#666' }}>32 questions · ~5 minutes</div>
          </Link>

          <Link
            to={reportLink}
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.08)',
              textDecoration: 'none',
              color: '#111',
            }}
          >
            <strong>View Your Report</strong>
            <div style={{ marginTop: 6, color: '#666' }}>Academic Profile + VESPA report + your notes</div>
          </Link>
        </div>

        <p style={{ marginTop: 14, color: '#777', fontSize: 13 }}>
          Need to switch device? Use <Link to="/student/access">Student access</Link> with your resume code + date of birth.
        </p>
      </div>
    </div>
  )
}

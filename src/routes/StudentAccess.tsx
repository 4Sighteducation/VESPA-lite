import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type ResumeStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; resumeToken: string }
  | { state: 'error'; message: string }

function toIsoDate(input: string) {
  const raw = (input || '').trim()
  if (!raw) return null

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // dd/mm/yyyy or dd-mm-yyyy
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    const yyyy = m[3]
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

export default function StudentAccess() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const [email, setEmail] = useState('')

  const [resumeCode, setResumeCode] = useState('')
  const [dob, setDob] = useState('')
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>({ state: 'idle' })

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSessionEmail(data.session?.user?.email || null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSessionEmail(s?.user?.email || null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const emailRedirectTo = useMemo(() => `${window.location.origin}/student/access`, [])

  const signInWithProvider = async (provider: 'google' | 'azure') => {
    setStatus('loading')
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: emailRedirectTo },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }
    setStatus('idle')
  }

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = email.trim()
    if (!target) return

    setStatus('loading')
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo,
      },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }
    setStatus('idle')
    setMessage('Check your email for a sign-in link.')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setMessage('Signed out.')
  }

  const submitResume = async (e: React.FormEvent) => {
    e.preventDefault()
    setResumeStatus({ state: 'loading' })

    const isoDob = toIsoDate(dob)
    if (!isoDob) {
      setResumeStatus({ state: 'error', message: 'Enter DOB as DD/MM/YYYY or YYYY-MM-DD.' })
      return
    }

    try {
      const r = await fetch('/api/student-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeCode: resumeCode.trim(), dateOfBirth: isoDob }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Unable to resume')
      const token = data?.resumeToken
      if (!token) throw new Error('Missing resumeToken')
      setResumeStatus({ state: 'success', resumeToken: token })
      window.location.assign(`/student/start/${encodeURIComponent(token)}`)
    } catch (err: any) {
      setResumeStatus({ state: 'error', message: err?.message || 'Unable to resume' })
    }
  }

  return (
    <div className="panel">
      <span className="pill">Student access</span>
      <h1>Sign in to VESPA</h1>
      <p>Choose the sign-in method that works best for you.</p>

      <div className="grid">
        <div className="card">
          <h3>Option 1 — School SSO</h3>
          <p>Use your school Microsoft/Google account.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="secondary" type="button" onClick={() => signInWithProvider('google')} disabled={status === 'loading'}>
              Continue with Google
            </button>
            <button className="secondary" type="button" onClick={() => signInWithProvider('azure')} disabled={status === 'loading'}>
              Continue with Microsoft
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Option 2 — Email magic link</h3>
          <p>No password. We send a link to your email inbox.</p>
          <form className="form" onSubmit={sendMagicLink}>
            <label>
              School email
              <input value={email} onChange={(ev) => setEmail(ev.target.value)} type="email" placeholder="name@school.org" required />
            </label>
            <button className="primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Option 3 — Resume code + DOB</h3>
          <p>If you can’t access email on this device, use your resume code.</p>
          <form className="form" onSubmit={submitResume}>
            <label>
              Resume code
              <input value={resumeCode} onChange={(ev) => setResumeCode(ev.target.value)} placeholder="e.g. A7K9Q" required />
            </label>
            <label>
              Date of birth
              <input value={dob} onChange={(ev) => setDob(ev.target.value)} placeholder="DD/MM/YYYY" required />
            </label>
            <button className="primary" type="submit" disabled={resumeStatus.state === 'loading'}>
              {resumeStatus.state === 'loading' ? 'Checking…' : 'Continue'}
            </button>
            {resumeStatus.state === 'error' ? <p className="error">Error: {resumeStatus.message}</p> : null}
          </form>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{ margin: 0, color: '#666' }}>
          Current session: <strong>{sessionEmail || 'Not signed in'}</strong>
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="ghost" type="button" onClick={logout} disabled={!sessionEmail}>
            Log out
          </button>
          <Link to="/student/report/demo">Open demo report</Link>
          <Link to="/student/questionnaire/demo">Open demo questionnaire</Link>
        </div>
        {status === 'error' ? <p className="error">Error: {message}</p> : null}
        {status === 'idle' && message ? <p className="success">{message}</p> : null}
      </div>
    </div>
  )
}


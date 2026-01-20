import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Establishment = { id: string; name: string | null; centre_number?: string | null; primary_contact_email?: string | null; created_at?: string | null }
type StaffRow = {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string | null
  roles: string[]
}

export default function AdminCenter() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [query, setQuery] = useState('')
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('')

  const [staff, setStaff] = useState<StaffRow[]>([])
  const [staffStatus, setStaffStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [staffMessage, setStaffMessage] = useState('')

  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [actionMessage, setActionMessage] = useState('')

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setStatus('loading')
        setMessage('')
        const token = await getAccessToken()
        if (!token) throw new Error('Log in as a super admin to access Admin Center.')

        const ctxRes = await fetch('/api/staff-admin-context', { headers: { Authorization: `Bearer ${token}` } })
        const ctx = await ctxRes.json()
        if (!ctxRes.ok) throw new Error(ctx?.error || 'Unable to load admin context')
        if (!ctx.isSuperAdmin) {
          setIsSuperAdmin(false)
          setStatus('ready')
          return
        }

        setIsSuperAdmin(true)
        const r = await fetch('/api/admin-establishments', { headers: { Authorization: `Bearer ${token}` } })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error || 'Unable to load establishments')
        if (cancelled) return
        setEstablishments(Array.isArray(data.establishments) ? data.establishments : [])
        setStatus('ready')
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error')
          setMessage(e?.message || 'Unable to load Admin Center')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return establishments
    return establishments.filter((e) => {
      const name = String(e.name || '').toLowerCase()
      const id = String(e.id || '').toLowerCase()
      const centre = String(e.centre_number || '').toLowerCase()
      const email = String(e.primary_contact_email || '').toLowerCase()
      return name.includes(q) || id.includes(q) || centre.includes(q) || email.includes(q)
    })
  }, [establishments, query])

  const loadStaff = async () => {
    setStaffStatus('loading')
    setStaffMessage('')
    setStaff([])
    setActionStatus('idle')
    setActionMessage('')

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not signed in')
      if (!selectedEstablishmentId) throw new Error('Select a school first')

      const r = await fetch(`/api/admin-staff?establishmentId=${encodeURIComponent(selectedEstablishmentId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Unable to load staff')
      setStaff(Array.isArray(data.staff) ? data.staff : [])
      setStaffStatus('idle')
    } catch (e: any) {
      setStaffStatus('error')
      setStaffMessage(e?.message || 'Unable to load staff')
    }
  }

  const resetAndResend = async (row: StaffRow) => {
    if (!selectedEstablishmentId) return
    if (!confirm(`Reset password + resend welcome email to ${row.email}?`)) return
    setActionStatus('loading')
    setActionMessage('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not signed in')
      const r = await fetch('/api/admin-staff-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: row.user_id }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Unable to reset password')
      setActionStatus('success')
      setActionMessage(`Welcome email sent to ${row.email}`)
    } catch (e: any) {
      setActionStatus('error')
      setActionMessage(e?.message || 'Unable to reset')
    }
  }

  const deleteStaff = async (row: StaffRow) => {
    if (!confirm(`Permanently delete staff user ${row.email}?\n\nThis deletes their Supabase Auth user and Lite staff records.`)) return
    setActionStatus('loading')
    setActionMessage('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not signed in')
      const r = await fetch('/api/admin-staff-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: row.user_id }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Unable to delete')
      setActionStatus('success')
      setActionMessage(`Deleted ${row.email}`)
      await loadStaff()
    } catch (e: any) {
      setActionStatus('error')
      setActionMessage(e?.message || 'Unable to delete')
    }
  }

  if (status === 'loading') {
    return (
      <div className="panel">
        <span className="pill">Admin Center</span>
        <h1>Loading…</h1>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="panel">
        <span className="pill">Admin Center</span>
        <h1>Not available</h1>
        <p className="error">{message}</p>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="panel">
        <span className="pill">Admin Center</span>
        <h1>Not authorised</h1>
        <p>This page is for super admins only.</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <span className="pill">Admin Center</span>
      <h1>Super admin</h1>
      <p>Emulate a school, manage staff accounts, and (later) manage questionnaires.</p>

      <div className="grid">
        <div className="card">
          <h3>Account management</h3>
          <p>Pick a school, then manage staff accounts.</p>
        </div>
        <div className="card">
          <h3>Questionnaire management</h3>
          <p>
            Coming soon. For now, you can use <Link to="/student/questionnaire/demo">the demo</Link> to review UI only.
          </p>
        </div>
      </div>

      <section className="section">
        <h2>Emulate a school</h2>
        <p>Select a school to manage its accounts (this sets the target establishment for actions).</p>

        <div className="form-grid">
          <label className="form-span">
            Search schools
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type name, URN, email, or UUID…" />
          </label>
          <label className="form-span">
            Select school
            <select value={selectedEstablishmentId} onChange={(e) => setSelectedEstablishmentId(e.target.value)}>
              <option value="">— Select —</option>
              {filtered.slice(0, 200).map((e) => (
                <option key={e.id} value={e.id}>
                  {(e.name || '(no name)') + (e.centre_number ? ` (${e.centre_number})` : '')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="primary" type="button" onClick={loadStaff} disabled={!selectedEstablishmentId || staffStatus === 'loading'}>
            {staffStatus === 'loading' ? 'Loading…' : 'Load staff'}
          </button>
          <Link className="secondary" to={`/staff/admin?establishmentId=${encodeURIComponent(selectedEstablishmentId || '')}`}>
            Open onboarding wizard for this school
          </Link>
        </div>

        {staffStatus === 'error' ? <p className="error">Error: {staffMessage}</p> : null}
        {actionStatus === 'error' ? <p className="error">Error: {actionMessage}</p> : null}
        {actionStatus === 'success' ? <p className="success">{actionMessage}</p> : null}
      </section>

      <section className="section">
        <h2>Staff accounts</h2>
        <p>Reset+resend will generate a new temporary password and send the welcome email again.</p>

        {staff.length ? (
          <div className="csv-table-wrap">
            <table className="csv-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.user_id}>
                    <td>{s.email}</td>
                    <td>{[s.first_name, s.last_name].filter(Boolean).join(' ')}</td>
                    <td>{(s.roles || []).join(', ')}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="secondary" type="button" onClick={() => resetAndResend(s)} disabled={actionStatus === 'loading'}>
                        Reset + resend welcome
                      </button>
                      <button className="ghost" type="button" onClick={() => deleteStaff(s)} disabled={actionStatus === 'loading'}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ marginTop: 10 }}>{selectedEstablishmentId ? 'No staff loaded yet. Click “Load staff”.' : 'Select a school first.'}</p>
        )}
      </section>
    </div>
  )
}


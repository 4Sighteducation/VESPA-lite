import { useState } from 'react'
import { useParams } from 'react-router-dom'

const roleOptions = [
  { value: 'tutor', label: 'Tutor' },
  { value: 'head_of_year', label: 'Head of Year' },
  { value: 'subject_teacher', label: 'Subject Teacher' },
  { value: 'head_of_department', label: 'Head of Department' },
  { value: 'staff_admin', label: 'Staff Admin' },
]

const StaffJoin = () => {
  const { token } = useParams()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roleType: 'tutor',
    tutorGroup: '',
    yearGroup: '',
    subject: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) {
      setStatus('error')
      setMessage('Invite token missing.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const response = await fetch('/api/staff-self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteToken: token,
          ...form,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to register')
      }
      setStatus('success')
      setMessage('Registration complete. Check your email for login details.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to register')
    }
  }

  return (
    <div className="panel">
      <span className="pill">Staff Join</span>
      <h1>Join your school</h1>
      <p>Complete the form below to create your VESPA Lite staff account.</p>

      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            First name
            <input
              required
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              placeholder="First name"
            />
          </label>
          <label>
            Last name
            <input
              required
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              placeholder="Last name"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="name@school.org"
            />
          </label>
          <label>
            Role
            <select
              value={form.roleType}
              onChange={(event) => setForm({ ...form, roleType: event.target.value })}
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
              value={form.tutorGroup}
              onChange={(event) => setForm({ ...form, tutorGroup: event.target.value })}
              placeholder="e.g. 12A"
            />
          </label>
          <label>
            Year group
            <input
              value={form.yearGroup}
              onChange={(event) => setForm({ ...form, yearGroup: event.target.value })}
              placeholder="e.g. Year 12"
            />
          </label>
          <label>
            Subject
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              placeholder="e.g. English"
            />
          </label>
        </div>
        <button className="primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Registering…' : 'Create staff account'}
        </button>
        {status === 'success' && <p className="success">{message}</p>}
        {status === 'error' && <p className="error">Error: {message}</p>}
      </form>
    </div>
  )
}

export default StaffJoin

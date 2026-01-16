import { Link, useParams } from 'react-router-dom'

const StudentStart = () => {
  const { token } = useParams()
  const t = token || 'demo'

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
        <span style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: 'rgba(7,155,170,0.08)', color: '#079baa', fontWeight: 700 }}>
          Student
        </span>
        <h1 style={{ margin: '12px 0 6px' }}>Welcome to VESPA</h1>
        <p style={{ margin: 0, color: '#555' }}>
          Access token: <code>{t}</code>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
          <Link
            to={`/student/questionnaire/${encodeURIComponent(t)}`}
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
            to={`/student/report/${encodeURIComponent(t)}`}
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
          Next step (later): student registration + resume code auth. For now this route is your student “launcher”.
        </p>
      </div>
    </div>
  )
}

export default StudentStart

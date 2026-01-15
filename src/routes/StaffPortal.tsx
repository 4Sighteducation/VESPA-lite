const StaffPortal = () => {
  return (
    <div className="panel">
      <span className="pill">Staff Portal</span>
      <h1>Coaching Dashboard</h1>
      <p>Quick view of progress, reports, and student support actions.</p>

      <div className="portal-hero">
        <div>
          <h2>Cycle 1 • Spring Pilot</h2>
          <p>Monitor completions, open reports, and add feedback.</p>
        </div>
        <a className="primary link-button" href="/staff/admin">
          Account management
        </a>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Completion status</h3>
          <p>12 complete · 8 in progress · 4 not started</p>
        </div>
        <div className="card">
          <h3>My tutor group</h3>
          <p>View linked students and filters.</p>
        </div>
        <div className="card">
          <h3>Reports ready</h3>
          <p>Open and comment on the latest reports.</p>
        </div>
      </div>

      <div className="portal-table">
        <div className="table-header">
          <h3>Students</h3>
          <input placeholder="Search by name..." />
        </div>
        <div className="table-row">
          <span>Amelia Shaw</span>
          <span>Complete</span>
          <button type="button">Open report</button>
        </div>
        <div className="table-row">
          <span>Omar Khan</span>
          <span>In progress</span>
          <button type="button">Send reminder</button>
        </div>
        <div className="table-row">
          <span>Emily Clarke</span>
          <span>Not started</span>
          <button type="button">Send invite</button>
        </div>
      </div>
    </div>
  )
}

export default StaffPortal

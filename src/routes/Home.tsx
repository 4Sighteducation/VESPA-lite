import { Link } from 'react-router-dom'

const Home = () => {
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
    </div>
  )
}

export default Home

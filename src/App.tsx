import './App.css'
import { Link, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import StudentStart from './routes/StudentStart'
import Resume from './routes/Resume'
import StaffJoin from './routes/StaffJoin'
import StaffPortal from './routes/StaffPortal'
import Login from './routes/Login'
import StaffAdmin from './routes/StaffAdmin'

const LOGO_URL = 'https://vespa.academy/_astro/vespalogo.BGrK1ARl.png'

function App() {
  return (
    <div className="app-shell">
      <div className="app-body">
        <aside className="sidebar">
          <div className="brand">
            <img src={LOGO_URL} alt="VESPA Academy" />
            <span>VESPA Lite</span>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">Staff</span>
            <nav className="sidebar-links">
              <Link to="/staff">Dashboard</Link>
              <Link to="/staff/admin">Account management</Link>
            </nav>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">Access</span>
            <nav className="sidebar-links">
              <Link to="/login">Login</Link>
              <Link to="/staff/join/demo">Staff join</Link>
              <Link to="/student/start/demo">Student start</Link>
              <Link to="/resume">Resume</Link>
            </nav>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">Admin</span>
            <nav className="sidebar-links">
              <Link to="/">Register a school</Link>
            </nav>
          </div>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/student/start/:token" element={<StudentStart />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/staff/join/:token" element={<StaffJoin />} />
            <Route path="/staff" element={<StaffPortal />} />
            <Route path="/staff/admin" element={<StaffAdmin />} />
            <Route path="/login" element={<Login />} />
          </Routes>
          <footer className="footer">VESPA Lite pilot • app.vespa.academy</footer>
        </main>
      </div>
    </div>
  )
}

export default App

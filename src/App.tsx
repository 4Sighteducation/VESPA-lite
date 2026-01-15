import './App.css'
import { Link, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import StudentStart from './routes/StudentStart'
import Resume from './routes/Resume'
import StaffJoin from './routes/StaffJoin'
import StaffPortal from './routes/StaffPortal'
import Login from './routes/Login'

const LOGO_URL = 'https://vespa.academy/_astro/vespalogo.BGrK1ARl.png'

function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <img src={LOGO_URL} alt="VESPA Academy" />
          <span>VESPA Lite</span>
        </div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/student/start/demo">Student</Link>
          <Link to="/resume">Resume</Link>
          <Link to="/staff">Staff</Link>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/student/start/:token" element={<StudentStart />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/staff/join/:token" element={<StaffJoin />} />
          <Route path="/staff" element={<StaffPortal />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
      <footer className="footer">VESPA Lite pilot • app.vespa.academy</footer>
    </div>
  )
}

export default App

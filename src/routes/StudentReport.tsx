import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './studentReport.css'

type CycleScore = {
  cycle: number
  vision: number | null
  effort: number | null
  systems: number | null
  practice: number | null
  attitude: number | null
  overall: number | null
  completion_date?: string | null
}

const vespaColors = {
  vision: '#ff8f00',
  effort: '#86b4f0',
  systems: '#72cb44',
  practice: '#7f31a4',
  attitude: '#f032e6',
}

function RadarChart({
  scores,
}: {
  scores: { vision: number | null; effort: number | null; systems: number | null; practice: number | null; attitude: number | null }
}) {
  // Lightweight SVG radar (enough to match the look/placement; we can replace with canvas later)
  const vals = [
    scores.vision ?? 0,
    scores.effort ?? 0,
    scores.systems ?? 0,
    scores.practice ?? 0,
    scores.attitude ?? 0,
  ].map((n) => Math.max(0, Math.min(10, n)))

  const points = useMemo(() => {
    const cx = 60
    const cy = 60
    const r = 46
    const angles = [(-90 * Math.PI) / 180, (-18 * Math.PI) / 180, (54 * Math.PI) / 180, (126 * Math.PI) / 180, (198 * Math.PI) / 180]
    return vals
      .map((v, i) => {
        const rr = (v / 10) * r
        const x = cx + rr * Math.cos(angles[i])
        const y = cy + rr * Math.sin(angles[i])
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [vals])

  return (
    <div className="radar-chart-container">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-label="VESPA radar chart">
        <polygon points="60,12 104,44 88,96 32,96 16,44" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" />
        <polygon points={points} fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
      </svg>
    </div>
  )
}

function AcademicProfileStub() {
  const [showMeg, setShowMeg] = useState(false)
  const [showStg, setShowStg] = useState(false)

  const subjects = [
    { name: 'English', examType: 'A Level', current: 'B', target: 'A', meg: 'B', stg: 'A' },
    { name: 'Maths', examType: 'A Level', current: 'C', target: 'B', meg: 'C', stg: 'B' },
    { name: 'Biology', examType: 'A Level', current: 'B', target: 'A', meg: 'B', stg: 'A' },
  ]

  return (
    <div className="vespa-profile-display">
      <section className="vespa-section profile-section">
        <h2 className="vespa-section-title">
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            Student Profile <span className="profile-info-button" title="Understanding These Grades">i</span>
          </span>
          <div className="profile-actions">
            <button className="small-toggle" type="button" onClick={() => setShowMeg((v) => !v)}>
              MEG: {showMeg ? 'On' : 'Off'}
            </button>
            <button className="small-toggle" type="button" onClick={() => setShowStg((v) => !v)}>
              STG: {showStg ? 'On' : 'Off'}
            </button>
            <span className="master-edit-icon edit-icon" title="Edit Target Grades">
              ✏️ Edit Targets
            </span>
          </div>
        </h2>

        <div className="profile-info ks5-layout">
          <div className="profile-details ks5-profile-strip">
            <div className="profile-name">Student Name</div>
            <div className="profile-items">
              <div className="profile-item">
                <span className="profile-label">School:</span> <span className="profile-value">TESTING SCHOOL 1</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Year Group:</span> <span className="profile-value">12</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Tutor Group:</span> <span className="profile-value">12A</span>
              </div>
            </div>
          </div>

          <div className="subjects-container">
            <div className="subjects-grid">
              {subjects.map((s) => (
                <div key={s.name} className="subject-card" style={{ ['--accent' as any]: '#00e5db' }}>
                  <div className="subject-title">
                    <div className="subject-name">{s.name}</div>
                  </div>
                  <div className="subject-meta">{s.examType}</div>

                  <div className="grades-container">
                    {showMeg ? (
                      <div className="grade-item">
                        <div className="grade-label">MEG</div>
                        <div className="grade-value grade-meg">
                          <span className="grade-text">{s.meg}</span>
                        </div>
                      </div>
                    ) : null}
                    {showStg ? (
                      <div className="grade-item">
                        <div className="grade-label">STG</div>
                        <div className="grade-value grade-stg">
                          <span className="grade-text">{s.stg}</span>
                        </div>
                      </div>
                    ) : null}

                    <div className="grade-item current-grade-item">
                      <div className="grade-label">Current</div>
                      <div className="grade-value-display">
                        <span className="grade-text">{s.current}</span>
                      </div>
                    </div>

                    <div className="grade-item target-grade-item">
                      <div className="grade-label">Target</div>
                      <div className="grade-value-display">
                        <span className="grade-text">{s.target}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ReportHeader({
  student,
  availableCycles,
  selectedCycle,
  allScores,
  onCycleChange,
  onViewAnswers,
  radar,
}: {
  student: { name: string; yearGroup?: string; group?: string; establishment?: string; logoUrl?: string }
  availableCycles: number[]
  selectedCycle: number
  allScores: CycleScore[]
  onCycleChange: (n: number) => void
  onViewAnswers: () => void
  radar: React.ReactNode
}) {
  const cycleData = allScores.find((s) => s.cycle === selectedCycle)
  const completionDate = cycleData?.completion_date || null
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="report-header">
      <div className="header-top">
        <div className="header-left">
          {student.logoUrl ? <img src={student.logoUrl} alt="School logo" className="school-logo" /> : null}
          <div className="student-info">
            <h1>{student.name}</h1>
            <div className="student-details">
              {student.yearGroup ? <span>Year {student.yearGroup}</span> : null}
              {student.group ? <span>{student.group}</span> : null}
              {student.establishment ? <span>{student.establishment}</span> : null}
              {completionDate ? (
                <span className="completion-date" key={`date-${selectedCycle}`}>
                  📅 Cycle {selectedCycle}: {formatDate(completionDate)}
                </span>
              ) : null}
            </div>
            <div className="action-buttons">
              <button type="button" onClick={onViewAnswers} className="action-button view-answers-button" title="View Questionnaire Responses">
                View Answers
              </button>
              <button type="button" onClick={() => window.print()} className="action-button print-button" title="Print Report">
                Print
              </button>
            </div>
          </div>
        </div>
        <div className="header-center">{radar}</div>
        <div className="header-right">
          <div className="cycle-selector">
            {availableCycles.map((c) => (
              <button key={c} type="button" className={`cycle-button ${c === selectedCycle ? 'active' : ''}`} onClick={() => onCycleChange(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="header-radar-mobile">{radar}</div>
    </div>
  )
}

function CoachingContent({
  scores,
  content,
}: {
  scores: { vision: number | null; effort: number | null; systems: number | null; practice: number | null; attitude: number | null }
  content: Record<
    string,
    { statement_text?: string; questions?: string[]; coaching_comments?: string[]; suggested_tools?: string[] }
  >
}) {
  const categories = [
    { name: 'Vision', key: 'vision' as const, color: vespaColors.vision },
    { name: 'Effort', key: 'effort' as const, color: vespaColors.effort },
    { name: 'Systems', key: 'systems' as const, color: vespaColors.systems },
    { name: 'Practice', key: 'practice' as const, color: vespaColors.practice },
    { name: 'Attitude', key: 'attitude' as const, color: vespaColors.attitude },
  ]

  return (
    <div className="coaching-content">
      {categories.map((cat) => {
        const c = content[cat.name] || {}
        const score = scores[cat.key]
        return (
          <div key={cat.name} className="category-row" style={{ borderLeftColor: cat.color }}>
            <div className="category-header" style={{ background: cat.color }}>
              <div className="header-content">
                <h3>{cat.name}</h3>
              </div>
            </div>
            <div className="row-content">
              <div className="score-card" style={{ background: cat.color }}>
                <div className="score-number">{score ?? '-'}</div>
                <div className="score-label">out of 10</div>
              </div>

              <div className="student-content">
                {c.statement_text ? (
                  <>
                    <div className="statement">
                      <p dangerouslySetInnerHTML={{ __html: c.statement_text }} />
                    </div>
                    {c.questions?.length ? (
                      <div className="questions">
                        <h4>Reflection Questions:</h4>
                        <ul>
                          {c.questions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="no-content">
                    <p>Complete the questionnaire to see personalized content.</p>
                  </div>
                )}
              </div>

              <div className="staff-content">
                {c.coaching_comments?.length ? (
                  <div className="coaching-comments">
                    <h4>Coaching Points:</h4>
                    <ul>
                      {c.coaching_comments.map((cc, idx) => (
                        <li key={idx}>{cc}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {c.suggested_tools?.length ? (
                  <div className="activities">
                    <h4>Suggested Activities:</h4>
                    <div className="activity-buttons">
                      {c.suggested_tools.map((a, idx) => (
                        <a
                          key={idx}
                          className="activity-button"
                          href="#"
                          style={{ background: `${cat.color}15`, borderColor: cat.color, color: cat.color }}
                          onClick={(e) => e.preventDefault()}
                        >
                          {a}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StudentResponse({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showHelp, setShowHelp] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const save = () => {
    setLastSaved(new Date().toLocaleString())
    setSuccess(true)
    window.setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <div className="student-response">
      <div className="section-header">
        <h3>💡 Your Reflection</h3>
        <button type="button" className="help-button" onClick={() => setShowHelp((v) => !v)}>
          <span className="help-icon">💡</span>
          {showHelp ? 'Hide Help' : 'Need Help?'}
        </button>
      </div>

      {showHelp ? (
        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h2>Writing Your VESPA Response</h2>
              <button className="help-modal-close" type="button" onClick={() => setShowHelp(false)}>
                ×
              </button>
            </div>
            <div className="help-modal-body">
              <div className="guide-intro">
                <p>
                  Your response helps your tutor/mentor understand your unique situation and provide personalized support. Be honest and specific —
                  there are no wrong answers!
                </p>
              </div>
              <h3>📊 Reflecting on Your VESPA Scores</h3>
              <div className="guide-section">
                <ul>
                  <li>
                    <strong>Do the scores feel right?</strong> Which ones resonate most with your experience?
                  </li>
                  <li>
                    <strong>Any surprises?</strong> Were any scores higher or lower than expected?
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="section-body">
        <div className="info-text">
          <p>✍️ Click here to write your reflection. Think about: What surprised you? What makes sense? What do you want to improve?</p>
        </div>
        <div className="textarea-wrapper">
          <textarea
            className="response-textarea"
            placeholder="✍️ Click here to write your reflection. Think about: What surprised you? What makes sense? What do you want to improve?"
            rows={8}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <div className="action-bar">
          <span className="last-saved">{lastSaved ? `Last saved: ${lastSaved}` : ''}</span>
          <button className="save-button" type="button" onClick={save} disabled={!value.trim()}>
            Save Response
          </button>
        </div>
        {success ? <div className="success-message">Response saved successfully!</div> : null}
      </div>
    </div>
  )
}

function StudentGoals({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const save = () => {
    setLastSaved(new Date().toLocaleString())
    setSuccess(true)
    window.setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <div className="student-goals">
      <div className="section-header">
        <h3>🎯 Your Goals</h3>
      </div>
      <div className="section-body">
        <div className="info-text">
          <p>Write 1–3 goals you will focus on this cycle. Be specific and realistic.</p>
        </div>
        <div className="textarea-wrapper">
          <textarea className="goal-textarea" placeholder="Write your goals here..." rows={6} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
        <div className="action-bar">
          <span className="last-saved">{lastSaved ? `Last saved: ${lastSaved}` : ''}</span>
          <button className="save-button" type="button" onClick={save} disabled={!value.trim()}>
            Save Goals
          </button>
        </div>
        {success ? <div className="success-message">Goals saved successfully!</div> : null}
      </div>
    </div>
  )
}

export default function StudentReport() {
  const { token } = useParams()
  const [selectedCycle, setSelectedCycle] = useState(1)
  const [reflection, setReflection] = useState('')
  const [goals, setGoals] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)
  const [coachingContent, setCoachingContent] = useState<
    Record<string, { statement_text?: string; questions?: string[]; coaching_comments?: string[]; suggested_tools?: string[] }>
  >({})
  const [coachingStatus, setCoachingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  const allScores: CycleScore[] = [
    { cycle: 1, vision: 7, effort: 6, systems: 5, practice: 6, attitude: 8, overall: 6, completion_date: '2026-01-15' },
  ]

  const availableCycles = [1]
  const currentScores = allScores.find((s) => s.cycle === selectedCycle) || allScores[0]

  const student = useMemo(
    () => ({
      name: 'Student Name',
      yearGroup: '12',
      group: '12A',
      establishment: 'TESTING SCHOOL 1',
      logoUrl: 'https://www.vespa.academy/assets/images/full-trimmed-transparent-customcolor-1-832x947.png',
    }),
    [],
  )

  // Rule (as agreed): Year Group < 12 => Level 2; Year Group > 11 => Level 3.
  const inferredLevel = useMemo(() => {
    const yg = Number(String(student.yearGroup || '').trim())
    if (Number.isFinite(yg) && yg < 12) return 'Level 2'
    if (Number.isFinite(yg) && yg > 11) return 'Level 3'
    return 'Level 3'
  }, [student.yearGroup])

  useEffect(() => {
    let cancelled = false

    const payload = {
      level: inferredLevel,
      scores: {
        Vision: currentScores.vision,
        Effort: currentScores.effort,
        Systems: currentScores.systems,
        Practice: currentScores.practice,
        Attitude: currentScores.attitude,
      },
    }

    async function load() {
      try {
        setCoachingStatus('loading')
        const r = await fetch('/api/coaching-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error || 'Failed to load coaching content')
        if (!cancelled) {
          setCoachingContent(data?.content || {})
          setCoachingStatus('ready')
        }
      } catch (e: any) {
        if (!cancelled) {
          console.warn('[StudentReport] coaching content load failed:', e)
          setCoachingContent({})
          setCoachingStatus('error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentScores.attitude, currentScores.effort, currentScores.practice, currentScores.systems, currentScores.vision, inferredLevel])

  return (
    <div id="vespa-student-report">
      <div className="student-report-topbar">
        <Link to={`/student/start/${encodeURIComponent(token || 'demo')}`} className="topbar-link">
          ← Back
        </Link>
      </div>

      <div id="vespa-report-app">
        <AcademicProfileStub />

        <div className="report-container">
          <ReportHeader
            student={student}
            availableCycles={availableCycles}
            selectedCycle={selectedCycle}
            allScores={allScores}
            onCycleChange={setSelectedCycle}
            onViewAnswers={() => setShowAnswers(true)}
            radar={<RadarChart scores={currentScores} />}
          />

          {showAnswers ? (
            <div className="help-modal-overlay" onClick={() => setShowAnswers(false)}>
              <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="help-modal-header">
                  <h2>Questionnaire Answers</h2>
                  <button className="help-modal-close" type="button" onClick={() => setShowAnswers(false)}>
                    ×
                  </button>
                </div>
                <div className="help-modal-body">
                  <p>Placeholder: this will show the student’s answers per question for the selected cycle.</p>
                </div>
              </div>
            </div>
          ) : null}

          {coachingStatus === 'loading' ? (
            <div style={{ padding: 18, color: '#666' }}>Loading coaching content…</div>
          ) : null}
          <CoachingContent scores={currentScores} content={coachingContent} />
          <StudentResponse value={reflection} onChange={setReflection} />
          <StudentGoals value={goals} onChange={setGoals} />
        </div>
      </div>
    </div>
  )
}


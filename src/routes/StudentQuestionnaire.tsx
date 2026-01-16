import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { LikertValue, Question } from '../student/questions'
import { categories, likertScale, questions as baseQuestions } from '../student/questions'
import { calculateVespaScores, validateResponses } from '../student/vespaCalculator'
import './studentQuestionnaire.css'

type State = 'checking' | 'instructions' | 'not-available' | 'questionnaire' | 'submitting' | 'success' | 'error'

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function LoadingCheck({ loadingText, subText }: { loadingText: string; subText: string }) {
  return (
    <div className="loading-check">
      <div className="loading-content">
        <img src="https://vespa.academy/_astro/vespalogo.BGrK1ARl.png" alt="VESPA" className="vespa-logo" />
        <div className="spinner" />
        <div className="loading-text">{loadingText}</div>
        <div className="loading-subtext">{subText}</div>
      </div>
    </div>
  )
}

function InstructionsScreen({ studentName, cycle, onStart }: { studentName?: string; cycle: number; onStart: () => void }) {
  return (
    <div className="instructions-screen">
      <div className="instructions-card">
        <div className="card-header">
          <img src="https://vespa.academy/_astro/vespalogo.BGrK1ARl.png" alt="VESPA Academy" className="logo" />
          <h1>VESPA Questionnaire</h1>
          <p className="subtitle">Understanding Your Academic Mindset</p>
        </div>
        <div className="card-body">
          {studentName ? (
            <div className="student-info">
              <span>
                Welcome, <strong>{studentName}</strong> | Cycle {cycle} of 3
              </span>
            </div>
          ) : null}
          <div className="info-compact">
            <p className="main-message">
              The VESPA Questionnaire measures your mindset across <strong>Vision, Effort, Systems, Practice, and Attitude</strong> to motivate
              growth and spark meaningful change.
            </p>
            <p className="remember-message">
              <span aria-hidden>ℹ️</span>
              Your results reflect <strong>how you see yourself right now</strong>—a snapshot, not a verdict.
            </p>
          </div>
          <div className="cta-section">
            <button className="btn btn-primary btn-large" type="button" onClick={onStart}>
              <span aria-hidden>▶</span>
              Start Questionnaire
            </button>
            <p className="time-estimate">
              <span aria-hidden>⏱</span>5 minutes · 32 questions
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressIndicator({
  currentQuestion,
  totalQuestions,
  categoryName,
  categoryColor,
}: {
  currentQuestion: number
  totalQuestions: number
  categoryName?: string
  categoryColor?: string
}) {
  const percentage = Math.round((currentQuestion / totalQuestions) * 100)
  return (
    <div className="progress-indicator">
      <div className="progress-info">
        <span className="progress-label">
          Question {currentQuestion} of {totalQuestions}
        </span>
        <span className="progress-percentage">{percentage}%</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
      {categoryName ? (
        <div className="current-category">
          <span className="category-dot" style={{ backgroundColor: categoryColor || '#079baa' }} />
          <span>{categoryName}</span>
        </div>
      ) : null}
    </div>
  )
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: Question
  value: LikertValue | null
  onChange: (v: LikertValue) => void
}) {
  return (
    <div className="question-card">
      <h3 className="question-text">{question.text}</h3>
      <div className="likert-scale">
        {likertScale.map((opt) => (
          <label key={opt.value} className={`likert-option ${value === opt.value ? 'selected' : ''}`}>
            <input
              type="radio"
              name={`question-${question.id}`}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="likert-input"
            />
            <div className="likert-circle">{opt.value}</div>
            <p className="likert-label">{opt.shortLabel}</p>
          </label>
        ))}
      </div>

      {question.explainer ? (
        <p className="explainer-text">
          <span aria-hidden>ℹ️</span>
          {question.explainer}
        </p>
      ) : null}

      {question.category === 'OUTCOME' ? (
        <p className="outcome-note">
          <span aria-hidden>💡</span>Note: This question doesn&apos;t affect your VESPA scores.
        </p>
      ) : null}
    </div>
  )
}

function NotAvailable({ message }: { message: string }) {
  return (
    <div className="not-available">
      <div className="not-available-card">
        <h2>Not available</h2>
        <p>{message}</p>
        <Link to="/student/start/demo" className="btn btn-secondary">
          Back
        </Link>
      </div>
    </div>
  )
}

function SuccessMessage({
  scores,
  reportLink,
}: {
  scores: Record<string, number>
  reportLink: string
}) {
  return (
    <div className="success-screen">
      <div className="success-card">
        <div className="success-header">
          <h2>✅ Questionnaire complete</h2>
          <p>Your VESPA scores have been calculated.</p>
        </div>
        <div className="scores-grid">
          {(['VISION', 'EFFORT', 'SYSTEMS', 'PRACTICE', 'ATTITUDE', 'OVERALL'] as const).map((k) => (
            <div key={k} className="score-tile">
              <div className="score-name">{k}</div>
              <div className="score-value">{scores[k]}</div>
            </div>
          ))}
        </div>
        <div className="success-actions">
          <Link className="btn btn-primary btn-large" to={reportLink}>
            View your report
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function StudentQuestionnaire() {
  const { token } = useParams()

  const [state, setState] = useState<State>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('Something went wrong.')
  const [cycle] = useState<number>(1)
  const [studentName] = useState<string>('Student')

  const [questions, setQuestions] = useState<Question[]>(() => [...baseQuestions])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [responses, setResponses] = useState<Record<string, LikertValue | undefined>>({})
  const [calculated, setCalculated] = useState<Record<string, number> | null>(null)

  const currentQuestion = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1

  const currentCategoryColor = useMemo(() => {
    const c = currentQuestion?.category
    return c ? categories[c]?.color || '#079baa' : '#079baa'
  }, [currentQuestion])

  useEffect(() => {
    // Lite: for now, we just require a token string
    const t = (token || '').trim()
    const ok = t.length >= 3
    const timer = window.setTimeout(() => {
      if (!ok) {
        setErrorMessage('Your access link is missing or invalid.')
        setState('not-available')
        return
      }
      setState('instructions')
    }, 450)
    return () => window.clearTimeout(timer)
  }, [token])

  const start = () => {
    setQuestions(shuffle(baseQuestions))
    setResponses({})
    setCurrentIdx(0)
    setState('questionnaire')
  }

  const next = async () => {
    const q = questions[currentIdx]
    if (!q || !responses[q.id]) return

    if (!isLast) {
      setCurrentIdx((n) => n + 1)
      return
    }

    const validation = validateResponses(responses, questions)
    if (!validation.valid) {
      window.alert(`Please answer all questions before submitting:\n${validation.errors.join('\n')}`)
      return
    }

    setState('submitting')
    window.setTimeout(() => {
      const calc = calculateVespaScores(responses, questions)
      setCalculated(calc.vespaScores)
      setState('success')
    }, 650)
  }

  const prev = () => {
    if (currentIdx > 0) setCurrentIdx((n) => n - 1)
  }

  const reportLink = `/student/report/${encodeURIComponent(token || 'demo')}`

  return (
    <div id="vespa-questionnaire-app">
      {state === 'checking' ? <LoadingCheck loadingText="Checking your questionnaire access..." subText="This will just take a moment" /> : null}
      {state === 'instructions' ? <InstructionsScreen studentName={studentName} cycle={cycle} onStart={start} /> : null}
      {state === 'not-available' ? <NotAvailable message={errorMessage} /> : null}
      {state === 'submitting' ? <LoadingCheck loadingText="Saving your responses..." subText="Calculating your VESPA scores" /> : null}
      {state === 'success' && calculated ? <SuccessMessage scores={calculated} reportLink={reportLink} /> : null}
      {state === 'error' ? <NotAvailable message={errorMessage} /> : null}

      {state === 'questionnaire' ? (
        <div className="questionnaire-container">
          <ProgressIndicator
            currentQuestion={currentIdx + 1}
            totalQuestions={questions.length}
            categoryName={currentQuestion?.category}
            categoryColor={currentCategoryColor}
          />
          <div className="questionnaire-content">
            <div className="question-and-nav">
              <QuestionCard
                question={currentQuestion}
                value={(responses[currentQuestion.id] as LikertValue | undefined) || null}
                onChange={(v) => setResponses((r) => ({ ...r, [currentQuestion.id]: v }))}
              />
              <div className="navigation-buttons">
                <button className="btn btn-secondary" type="button" onClick={prev} disabled={currentIdx === 0}>
                  ← Previous
                </button>
                <button className="btn btn-primary" type="button" onClick={next} disabled={!responses[currentQuestion.id]}>
                  {isLast ? 'Submit' : 'Next'} {isLast ? '✓' : '→'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


import { useParams } from 'react-router-dom'

const StudentStart = () => {
  const { token } = useParams()

  return (
    <div className="panel">
      <span className="pill">Student Registration</span>
      <h1>Start Questionnaire</h1>
      <p>Invite token: <code>{token || 'missing'}</code></p>
      <p>Next step: build the registration form + tutor search.</p>
    </div>
  )
}

export default StudentStart

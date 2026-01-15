import { useParams } from 'react-router-dom'

const StaffJoin = () => {
  const { token } = useParams()

  return (
    <div className="panel">
      <span className="pill">Staff Join</span>
      <h1>Join with Staff Invite</h1>
      <p>Invite token: <code>{token || 'missing'}</code></p>
      <p>Next step: add auth + staff profile capture.</p>
    </div>
  )
}

export default StaffJoin

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    window.location.assign('/staff')
  }

  const handleOAuthLogin = async (provider: 'google' | 'azure') => {
    setStatus('loading')
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/staff`,
      },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setStatus('error')
      setMessage('Enter your email address first.')
      return
    }
    setStatus('loading')
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }
    setStatus('idle')
    setMessage('Password reset email sent.')
  }

  return (
    <div className="panel">
      <span className="pill">Staff Login</span>
      <h1>Welcome back</h1>
      <p>Sign in with your email and temporary password, or use single sign-on.</p>

      <div className="login-layout">
        <form className="login-card" onSubmit={handleLogin}>
          <h3>Email login</h3>
          <label className="login-field">
            Email address
            <input
              type="email"
              placeholder="name@school.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="login-field">
            Password
            <input
              type="password"
              placeholder="Temporary password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>
          <button className="ghost" type="button" onClick={handleForgotPassword}>
            Forgot password
          </button>
          {status === 'error' && <p className="error">Error: {message}</p>}
          {status === 'idle' && message && <p className="success">{message}</p>}
        </form>

        <div className="login-card">
          <h3>Single sign-on</h3>
          <p>Use your school account for a one-click sign in.</p>
          <button
            className="secondary"
            type="button"
            onClick={() => handleOAuthLogin('google')}
          >
            Continue with Google
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => handleOAuthLogin('azure')}
          >
            Continue with Microsoft
          </button>
          <p className="login-note">We’ll enable these once Supabase providers are linked.</p>
        </div>
      </div>
    </div>
  )
}

export default Login

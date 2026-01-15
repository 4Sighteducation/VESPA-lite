const Login = () => {
  return (
    <div className="panel">
      <span className="pill">Staff Login</span>
      <h1>Welcome back</h1>
      <p>Sign in with your email and temporary password, or use single sign-on.</p>

      <div className="login-layout">
        <div className="login-card">
          <h3>Email login</h3>
          <label className="login-field">
            Email address
            <input type="email" placeholder="name@school.org" />
          </label>
          <label className="login-field">
            Password
            <input type="password" placeholder="Temporary password" />
          </label>
          <button className="primary" type="button">Sign in</button>
          <button className="ghost" type="button">Forgot password</button>
        </div>

        <div className="login-card">
          <h3>Single sign-on</h3>
          <p>Use your school account for a one-click sign in.</p>
          <button className="secondary" type="button">Continue with Google</button>
          <button className="secondary" type="button">Continue with Microsoft</button>
          <p className="login-note">We’ll enable these once Supabase providers are linked.</p>
        </div>
      </div>
    </div>
  )
}

export default Login

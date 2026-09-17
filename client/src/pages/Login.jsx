import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand"><span className="brand-mark">A</span><span>aegisBreach</span></div>
        <div className="login-heading">
          <p className="eyebrow">Internal training environment</p>
          <h1 id="login-title">Sign in</h1>
          <p>Enter your credentials to access the review workspace.</p>
        </div>
        <form className="login-form" onSubmit={(event) => { event.preventDefault(); navigate('/projects') }}>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="name@company.com" />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Password" />
          <button className="primary-button" type="submit">Sign in</button>
        </form>
        <Link className="login-project-link" to="/projects">Continue to project selection</Link>
      </section>
    </main>
  )
}

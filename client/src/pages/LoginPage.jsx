import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Banner, Logo, TextField } from '../components/ui'

export default function LoginPage({ notice, onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    setError('')
    const attempt = { email: email.trim(), password }
    // The password box is emptied at once, so it is never kept on screen after sending
    setPassword('')
    try {
      const result = await api.post('/auth/login', attempt, { redirectOnUnauthorized: false })
      onSignedIn(result)
    } catch (err) {
      // One generic message for every refusal, so nobody can find out which emails exist
      setError(err.status === 401 ? 'Invalid email or password.' : err.message)
      setSubmitting(false)
    }
  }

  return (
    <main id="main" className="login-layout">
      <section className="login-hero">
        <div className="login-hero-inner">
          <div className="brand brand-light">
            <Logo />
            <span className="brand-name">Learning Progress Tracker</span>
          </div>
          <p className="hero-title">Training, one step at a time.</p>
          <p className="hero-text">
            Coordinators assign activities and follow the cohort. Candidates sign in to update their own
            training.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h1>Sign in</h1>
          <p className="muted">Use the email and password from your coordinator.</p>
          {notice && <Banner type="info">{notice}</Banner>}
          {error && <Banner type="error">{error}</Banner>}
          <form onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              inputRef={emailRef}
            />
            <TextField
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="muted small">
            First time here? Sign in with the temporary password you were given. You will then choose a
            new one.
          </p>
        </div>
      </section>
    </main>
  )
}

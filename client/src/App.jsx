import { useEffect, useState } from 'react'
import { api, setSessionEndedHandler } from './api'
import Shell from './components/Shell'
import { ErrorState, Spinner } from './components/ui'
import CandidateHome from './pages/CandidateHome'
import ChangePasswordPage from './pages/ChangePasswordPage'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import LoginPage from './pages/LoginPage'

export default function App() {
  const [session, setSession] = useState(null) // { role, mustChangePassword } while signed in
  const [phase, setPhase] = useState('checking') // "checking", "ready" or "offline"
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0) // goes up each time the person presses "Try again"

  useEffect(() => {
    // If any later request says "please sign in" (expired session), go back to the sign in page
    setSessionEndedHandler(() => {
      setSession(null)
      setNotice('Your session has ended. Please sign in again.')
    })
  }, [])

  // On page load (and refresh) ask the server who is signed in. The browser keeps only a cookie.
  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/me', { redirectOnUnauthorized: false })
      .then((me) => {
        if (cancelled) return
        setSession(me)
        setPhase('ready')
      })
      .catch((err) => {
        if (cancelled) return
        if (err.status === 401) {
          setSession(null)
          setPhase('ready')
        } else {
          setPhase('offline')
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function handleLogout() {
    try {
      await api.post('/auth/logout', {}, { redirectOnUnauthorized: false })
    } catch {
      // The session may already be gone. Either way we show the sign in page.
    }
    setSession(null)
    setNotice('You have been signed out.')
  }

  if (phase === 'checking') {
    return (
      <Shell>
        <Spinner label="Starting" />
      </Shell>
    )
  }

  if (phase === 'offline') {
    return (
      <Shell>
        <ErrorState
          message="Cannot reach the server. Make sure the API is running, then try again."
          onRetry={() => {
            setPhase('checking')
            setAttempt((count) => count + 1)
          }}
        />
      </Shell>
    )
  }

  if (!session) {
    return (
      <LoginPage
        notice={notice}
        onSignedIn={(next) => {
          setNotice('')
          setSession(next)
        }}
      />
    )
  }

  if (session.mustChangePassword) {
    return (
      <Shell role={session.role} onLogout={handleLogout}>
        <ChangePasswordPage onChanged={() => setSession({ ...session, mustChangePassword: false })} />
      </Shell>
    )
  }

  return (
    <Shell role={session.role} onLogout={handleLogout}>
      {session.role === 'Coordinator' ? <CoordinatorDashboard /> : <CandidateHome />}
    </Shell>
  )
}

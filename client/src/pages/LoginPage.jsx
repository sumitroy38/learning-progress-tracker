import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Banner, Logo, TextField } from '../components/ui'

const STEPS = [
  { id: 'assigned', title: 'Assigned', note: 'Your coordinator sets up modules and planned hours.', pct: 33, color: 'bg-stone-400' },
  { id: 'progress', title: 'In Progress', note: 'Track what you are actively working through.', pct: 68, color: 'bg-rose-400' },
  { id: 'done', title: 'Completed', note: 'Mark modules done and watch your cohort progress grow.', pct: 100, color: 'bg-teal-600' },
]

export default function LoginPage({ notice, onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeStep, setActiveStep] = useState(2)
  const [ready, setReady] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
    const id = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(id)
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

  const currentStep = STEPS[activeStep]

  return (
    <main id="main" className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-stone-50">
      {/* Left Light Studio Hero */}
      <section className="lg:col-span-6 bg-gradient-to-br from-teal-50 via-white to-rose-50/90 border-b lg:border-b-0 lg:border-r border-stone-200 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          <div className="inline-flex items-center gap-2.5 text-teal-700">
            <Logo />
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              Learning Progress Tracker
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900 leading-[1.12]">
              Training, one step at a time.
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Coordinators assign activities and follow the cohort. Candidates sign in to update their own training.
            </p>
          </div>

          {/* Interactive Animated Workflow Card */}
          <div className="bg-white/90 border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600">
              <span>How it flows</span>
              <span className="font-mono text-teal-700 tabular-nums">{ready ? currentStep.pct : 0}%</span>
            </div>

            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden" aria-hidden="true">
              <div
                className={`h-full rounded-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${currentStep.color}`}
                style={{ width: `${ready ? currentStep.pct : 0}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold motion-safe:transition-all duration-150 cursor-pointer ${
                    activeStep === idx
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  {step.title}
                </button>
              ))}
            </div>

            <p className="text-xs text-stone-600 min-h-[2rem]">{currentStep.note}</p>
          </div>
        </div>
      </section>

      {/* Right Sign-In Card */}
      <section className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-7 sm:p-9 shadow-sm space-y-6">
          <div>
            <p className="text-xs font-bold tracking-wide text-teal-700">Welcome back</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Use the email and password from your coordinator.
            </p>
          </div>

          {notice && <Banner type="info">{notice}</Banner>}
          {error && <Banner type="error">{error}</Banner>}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[46px] text-sm font-bold text-white bg-teal-600 rounded-2xl shadow-xs hover:bg-teal-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none motion-safe:transition-all duration-150 cursor-pointer"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl text-xs text-stone-600 leading-relaxed">
            First time here? Sign in with the temporary password you were given. You will then choose a new one.
          </p>
        </div>
      </section>
    </main>
  )
}
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Banner, TextField } from '../components/ui'

// Shown after signing in with a temporary password. Nothing else is open until this is done.
export default function ChangePasswordPage({ onChanged }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  function validate() {
    const found = {}
    if (!current) found.current = 'Enter your current (temporary) password.'
    if (!next) found.next = 'Enter a new password.'
    else if (next.length < 10) found.next = 'Use at least 10 characters.'
    else if (next === current) found.next = 'Choose a password different from the current one.'
    if (!confirm) found.confirm = 'Enter the new password again.'
    else if (confirm !== next) found.confirm = 'The two passwords do not match.'
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await api.post(
        '/auth/change-password',
        { currentPassword: current, newPassword: next },
        { redirectOnUnauthorized: false },
      )
      setCurrent('')
      setNext('')
      setConfirm('')
      onChanged()
    } catch (err) {
      setFormError(err.message)
      setSaving(false)
    }
  }

  // UI-only live requirement checks
  const checks = [
    { label: 'At least 10 characters', ok: next.length >= 10 },
    { label: 'Different from temporary password', ok: Boolean(next) && next !== current },
    { label: 'Confirmation matches', ok: Boolean(confirm) && confirm === next },
  ]
  const metCount = checks.filter((c) => c.ok).length

  return (
    <div className="py-6 sm:py-10 px-4">
      <section className="max-w-lg mx-auto bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Soft Gradient Header */}
        <div className="bg-gradient-to-br from-teal-50/80 via-white to-rose-50/70 px-6 py-6 sm:px-8 border-b border-stone-200 flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide text-teal-700">Account Setup</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-stone-900">
              Choose a new password
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              For your security, replace the temporary password before you continue. Your training opens right after.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {formError && <Banner type="error">{formError}</Banner>}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <TextField
              label="Current (temporary) password"
              type="password"
              name="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              error={errors.current}
              inputRef={firstRef}
            />
            <TextField
              label="New password"
              type="password"
              name="new-password"
              autoComplete="new-password"
              maxLength={72}
              hint="At least 10 characters. Do not reuse a password from another site."
              value={next}
              onChange={(event) => setNext(event.target.value)}
              error={errors.next}
            />
            <TextField
              label="Repeat the new password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              maxLength={72}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              error={errors.confirm}
            />

            {/* Live Animated Password Checklist */}
            <div className="p-4 bg-stone-50/90 border border-stone-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                <span>Password readiness</span>
                <span className="font-mono tabular-nums text-teal-700">{metCount}/3</span>
              </div>
              <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden" aria-hidden="true">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-teal-500 rounded-full motion-safe:transition-all duration-300 ease-out"
                  style={{ width: `${(metCount / 3) * 100}%` }}
                />
              </div>
              <ul className="space-y-1.5">
                {checks.map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center gap-2 text-xs font-medium motion-safe:transition-colors duration-200 ${
                      item.ok ? 'text-teal-800' : 'text-stone-500'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold motion-safe:transition-all duration-200 ${
                        item.ok ? 'bg-teal-600 text-white scale-100' : 'bg-stone-200 text-stone-500 scale-90'
                      }`}
                      aria-hidden="true"
                    >
                      {item.ok ? '✓' : '·'}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[46px] text-sm font-bold text-white bg-teal-600 rounded-2xl shadow-xs hover:bg-teal-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none motion-safe:transition-all duration-150 cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
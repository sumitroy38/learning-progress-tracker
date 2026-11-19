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

  return (
    <div className="card narrow">
      <h1>Choose a new password</h1>
      <p className="muted">
        For your security, replace the temporary password before you continue. Your training opens right
        after.
      </p>
      {formError && <Banner type="error">{formError}</Banner>}
      <form onSubmit={handleSubmit} noValidate>
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
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  )
}

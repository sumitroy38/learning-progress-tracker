import { useId } from 'react'

// Small building blocks used all over the app.

export function Logo() {
  return (
    <svg className="logo" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#fff" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="#fff" />
      <rect x="21" y="7" width="4" height="18" rx="1.5" fill="#fff" />
    </svg>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  )
}

// type is "info", "success" or "error". Errors are announced to screen readers at once.
export function Banner({ type = 'info', children, onDismiss }) {
  return (
    <div className={`banner banner-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onDismiss && (
        <button type="button" className="banner-close" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state">
      <Banner type="error">{message}</Banner>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="state empty">
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  )
}

export function StatusBadge({ status }) {
  const tone = status === 'Completed' ? 'done' : status === 'In Progress' ? 'active' : 'idle'
  return <span className={`badge badge-${tone}`}>{status}</span>
}

export function ProgressBar({ value, max, label }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

// A label, an input, an optional hint and an optional error message, all linked together
export function TextField({ label, error, hint, inputRef, ...inputProps }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

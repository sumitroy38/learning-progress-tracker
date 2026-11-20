import { useId } from 'react'

// Small building blocks used all over the app.
export function Logo() {
  return (
    <svg
      className="shrink-0"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="#0d9488" />
      <path
        d="M9 11.5C9 10.67 9.67 10 10.5 10H15V22L10.5 20.6C9.67 20.34 9 19.57 9 18.7V11.5Z"
        fill="#ffffff"
        fillOpacity="0.95"
      />
      <path
        d="M23 11.5C23 10.67 22.33 10 21.5 10H17V22L21.5 20.6C22.33 20.34 23 19.57 23 18.7V11.5Z"
        fill="#ffffff"
        fillOpacity="0.7"
      />
    </svg>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="inline-flex items-center justify-center gap-3 py-6 text-sm font-medium text-stone-500" role="status">
      <span
        className="w-5 h-5 rounded-full border-2 border-stone-200 border-t-teal-600 animate-spin"
        aria-hidden="true"
      />
      <span>{label}…</span>
    </div>
  )
}

const BANNER_STYLES = {
  info: 'bg-teal-50 border-teal-200 text-teal-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  error: 'bg-rose-50 border-rose-200 text-rose-900',
}

// type is "info", "success" or "error". Errors are announced to screen readers at once.
export function Banner({ type = 'info', children, onDismiss }) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3 text-sm font-medium border rounded-2xl ${BANNER_STYLES[type] || BANNER_STYLES.info}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <span className="leading-snug">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="w-6 h-6 -mr-1 -mt-0.5 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-black/5 text-base leading-none cursor-pointer motion-safe:transition-colors"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="py-4 text-center space-y-3">
      <div className="text-left">
        <Banner type="error">{message}</Banner>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 min-h-[40px] text-xs font-bold text-stone-800 bg-white border border-stone-200 rounded-xl hover:border-stone-300 hover:bg-stone-50 active:scale-95 motion-safe:transition-all cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="py-8 px-4 text-center space-y-1.5">
      <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-stone-100 border border-stone-200/80 text-stone-500 inline-flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </div>
      <p className="text-sm font-extrabold text-stone-900">{title}</p>
      {children && <p className="text-xs text-stone-500 max-w-sm mx-auto">{children}</p>}
    </div>
  )
}

const BADGE_STYLES = {
  done: 'bg-teal-50 text-teal-800 border-teal-200',
  active: 'bg-rose-50 text-rose-800 border-rose-200',
  idle: 'bg-stone-100 text-stone-600 border-stone-200',
}

export function StatusBadge({ status }) {
  const tone = status === 'Completed' ? 'done' : status === 'In Progress' ? 'active' : 'idle'
  const icon = status === 'Completed' ? '✓' : status === 'In Progress' ? '◐' : '○'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${BADGE_STYLES[tone]}`}
    >
      <span aria-hidden="true">{icon}</span>
      {status}
    </span>
  )
}

export function ProgressBar({ value, max, label }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div
      className="h-2.5 w-full bg-stone-200/80 rounded-full overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out"
        style={{ width: `${percent}%` }}
      />
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
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-stone-700">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full px-3.5 py-2.5 min-h-[44px] text-sm font-medium text-stone-900 placeholder:text-stone-400 bg-white border rounded-xl focus:outline-none focus:ring-4 motion-safe:transition-all duration-150 ${
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15'
            : 'border-stone-200 hover:border-stone-300 focus:border-teal-600 focus:ring-teal-500/15'
        }`}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}
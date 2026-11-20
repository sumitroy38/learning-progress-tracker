import { useEffect, useRef, useState } from 'react'

// Shows one time credentials to the coordinator for private handover.
// They live only in this screen's memory. Close the panel and they are gone for good.
export default function CredentialsPanel({ issued, onDismiss }) {
  const panelRef = useRef(null)
  const [copyMessage, setCopyMessage] = useState('')

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword)
      setCopyMessage('Password copied.')
    } catch {
      setCopyMessage('Could not copy. Please select the password and copy it by hand.')
    }
  }

  const expires = new Date(issued.expiresAt).toLocaleString()

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="credentials-heading"
      className="bg-gradient-to-br from-rose-50/90 via-white to-teal-50/60 border border-rose-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
    >
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-200 text-rose-800 inline-flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
          </svg>
        </span>

        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-rose-700">One-time handover</p>
          <h2 id="credentials-heading" className="mt-0.5 text-xl font-extrabold tracking-tight text-stone-900">
            Temporary credentials for {issued.name}
          </h2>
          <p className="mt-1 text-sm text-stone-600 leading-relaxed">
            Hand these over privately. They are shown only once and cannot be viewed again. The password expires on{' '}
            <span className="font-semibold text-stone-800 tabular-nums">{expires}</span>, and {issued.name} must choose a new password at first sign in.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
          <dt className="text-xs font-bold text-stone-500">Username</dt>
          <dd>
            <code className="block font-mono text-sm font-semibold text-stone-900 select-all break-all">
              {issued.username}
            </code>
          </dd>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
          <dt className="text-xs font-bold text-stone-500">Temporary password</dt>
          <dd>
            <code className="block font-mono text-sm font-bold text-teal-800 select-all break-all">
              {issued.temporaryPassword}
            </code>
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copyPassword}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] text-xs font-bold text-stone-800 bg-white border border-stone-200 rounded-xl hover:border-stone-300 hover:bg-stone-50 active:scale-95 motion-safe:transition-all duration-150 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          Copy password
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-95 motion-safe:transition-all duration-150 cursor-pointer"
        >
          I have saved these, hide them
        </button>

        {copyMessage && (
          <p className="text-xs font-semibold text-teal-700" role="status">
            {copyMessage}
          </p>
        )}
      </div>
    </section>
  )
}
import { useEffect, useState } from 'react'
import { Logo } from './ui'

// The frame around every signed in page: skip link, header with sign out, and the main area
export default function Shell({ role, onLogout, children }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-100/60 to-teal-50/30 text-stone-900 flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-teal-600 focus:text-white focus:text-xs focus:font-semibold focus:shadow-md"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 bg-white/75 hover:bg-white/85 backdrop-blur-lg border-b border-stone-200/80 hover:border-stone-300/70 motion-safe:transition-all duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="group flex items-center gap-3 min-w-0 shrink-0 cursor-default">
            <span className="motion-safe:transition-transform duration-200 ease-out group-hover:scale-105 group-hover:-rotate-3">
              <Logo />
            </span>
            <span className="text-sm sm:text-base font-bold tracking-tight text-stone-900 group-hover:text-teal-700 motion-safe:transition-colors duration-200 whitespace-nowrap">
              Learning Progress Tracker
            </span>
          </div>

          <div className="flex items-center gap-3.5 shrink-0">
            {role && (
              <span className="hidden sm:inline text-xs font-medium text-stone-500 hover:text-stone-800 motion-safe:transition-colors duration-150 capitalize whitespace-nowrap">
                {role}
              </span>
            )}
            {role && onLogout && <span className="hidden sm:block h-4 w-px bg-stone-200" aria-hidden="true" />}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="group inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-stone-700 bg-white/80 border border-stone-200 rounded-xl shadow-2xs hover:-translate-y-0.5 hover:shadow-sm hover:border-rose-300 hover:bg-rose-50/70 hover:text-rose-800 active:translate-y-0 active:scale-[0.98] motion-safe:transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Sign out</span>
                <svg
                  className="w-3.5 h-3.5 text-stone-500 group-hover:text-rose-600 group-hover:translate-x-0.5 motion-safe:transition-all duration-150"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        id="main"
        className={`flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9 motion-safe:transition-all duration-300 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
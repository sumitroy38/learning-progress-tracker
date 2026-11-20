import { useEffect, useState } from 'react'
import { useLoad } from '../useLoad'
import { ErrorState, ProgressBar } from '../components/ui'
import ActivitiesPanel from './ActivitiesPanel'
import CandidatesPanel from './CandidatesPanel'

const TABS = [
  { id: 'candidates', label: 'Candidates' },
  { id: 'activities', label: 'Activities' },
]

export default function CoordinatorDashboard() {
  const [tab, setTab] = useState('candidates')
  // The totals are counted by the server from saved data. We refresh them after every change.
  const summary = useLoad('/cohort-summary')

  return (
    <div className="space-y-6">
      {/* Header + Live Refresh + Segmented Navigation */}
      <div className="bg-gradient-to-br from-teal-50/80 via-white to-rose-50/70 border border-stone-200 rounded-3xl px-6 py-6 sm:px-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-bold tracking-wide text-teal-700">Coordinator Hub</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            Cohort dashboard
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Add candidates, assign training and follow progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={summary.reload}
            disabled={summary.status === 'loading'}
            title="Refresh cohort totals"
            className="group inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-2xl shadow-xs hover:border-teal-300 hover:text-teal-800 active:scale-95 disabled:opacity-60 motion-safe:transition-all duration-150 cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 text-teal-700 ${summary.status === 'loading' ? 'motion-safe:animate-spin' : 'group-hover:rotate-180 motion-safe:transition-transform duration-300'}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Refresh
          </button>

          <nav
            className="inline-flex items-center gap-1 p-1.5 bg-white border border-stone-200 rounded-2xl shadow-xs"
            aria-label="Dashboard sections"
          >
            {TABS.map((item) => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(item.id)}
                  className={`px-4 py-2 min-h-[38px] text-xs font-bold rounded-xl motion-safe:transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <SummaryTiles summary={summary} activeTab={tab} onSelectTab={setTab} />

      {tab === 'candidates' ? <CandidatesPanel onChanged={summary.reload} /> : <ActivitiesPanel />}
    </div>
  )
}

function SummaryTiles({ summary, activeTab, onSelectTab }) {
  const [ready, setReady] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [hoveredSegment, setHoveredSegment] = useState(null)

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(id)
  }, [])

  if (summary.status === 'error' && !summary.data) {
    return <ErrorState message={summary.error} onRetry={summary.reload} />
  }

  const data = summary.data
  const percent = data && data.assignments > 0 ? Math.round((data.completed / data.assignments) * 100) : 0
  const remaining = data ? Math.max(0, data.assignments - data.completed) : 0

  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * (ready && data ? percent : 0)) / 100

  return (
    <div className="space-y-4">
      <section
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        aria-label="Cohort summary"
        aria-busy={summary.status === 'loading'}
      >
        {/* Interactive Learners Tile -> switches to Candidates */}
        <button
          type="button"
          onClick={() => onSelectTab?.('candidates')}
          className={`group text-left bg-white border rounded-3xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-safe:transition-all duration-200 flex items-start justify-between gap-4 cursor-pointer ${
            activeTab === 'candidates' ? 'border-teal-400 ring-2 ring-teal-500/15' : 'border-stone-200 hover:border-teal-300'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-stone-500">Learners</p>
            <p className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900 tabular-nums">
              {data ? data.learners : '…'}
            </p>
            <p className="mt-2 text-xs font-semibold text-teal-700 group-hover:translate-x-0.5 motion-safe:transition-transform">
              View roster →
            </p>
          </div>
          <span className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-700 inline-flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:-rotate-3 motion-safe:transition-transform duration-200">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
        </button>

        {/* Interactive Assignments Tile -> switches to Activities */}
        <button
          type="button"
          onClick={() => onSelectTab?.('activities')}
          className={`group text-left bg-white border rounded-3xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-safe:transition-all duration-200 flex items-start justify-between gap-4 cursor-pointer ${
            activeTab === 'activities' ? 'border-rose-400 ring-2 ring-rose-500/15' : 'border-stone-200 hover:border-rose-300'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-stone-500">Assignments</p>
            <p className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900 tabular-nums">
              {data ? data.assignments : '…'}
            </p>
            <p className="mt-2 text-xs font-semibold text-rose-700 group-hover:translate-x-0.5 motion-safe:transition-transform">
              Open catalog →
            </p>
          </div>
          <span className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 inline-flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-3 motion-safe:transition-transform duration-200">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
            </svg>
          </span>
        </button>

        {/* Interactive Completed Tile -> toggles live breakdown bar */}
        <div className="bg-gradient-to-br from-white to-teal-50/50 border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md motion-safe:transition-all duration-200 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-stone-500">Completed</p>
                {data && data.assignments > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    {showBreakdown ? 'Hide pulse' : 'Show pulse'}
                  </button>
                )}
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-teal-800 tabular-nums">
                {data ? data.completed : '…'}
              </p>
            </div>

            {data && (
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                  <circle cx="28" cy="28" r={r} fill="none" stroke="#e7e5e4" strokeWidth="5.5" />
                  <circle
                    cx="28"
                    cy="28"
                    r={r}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold font-mono text-stone-900 tabular-nums">
                  {percent}%
                </span>
              </div>
            )}
          </div>

          {data && (
            <div className="space-y-1">
              <ProgressBar value={data.completed} max={data.assignments} label="Completed assignments" />
              <p className="text-xs font-medium text-stone-500 tabular-nums">{percent}% of assignments</p>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Animated Cohort Pulse Bar */}
      {data && data.assignments > 0 && showBreakdown && (
        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-stone-800">
              Cohort completion pulse
              {hoveredSegment && (
                <span className="ml-2 font-semibold text-teal-700 tabular-nums">
                  · {hoveredSegment === 'done' ? `${data.completed} completed (${percent}%)` : `${remaining} remaining (${100 - percent}%)`}
                </span>
              )}
            </span>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-stone-600 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-xs bg-teal-500" /> Completed ({data.completed})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-xs bg-rose-300" /> Remaining ({remaining})
              </span>
            </div>
          </div>

          <div className="flex h-3 w-full rounded-full bg-stone-100 overflow-hidden gap-1">
            {data.completed > 0 && (
              <div
                onMouseEnter={() => setHoveredSegment('done')}
                onMouseLeave={() => setHoveredSegment(null)}
                style={{ width: ready ? `${percent}%` : '0%' }}
                className={`h-full bg-teal-500 rounded-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out cursor-pointer ${
                  hoveredSegment === 'todo' ? 'opacity-45' : 'opacity-100 hover:brightness-105'
                }`}
              />
            )}
            {remaining > 0 && (
              <div
                onMouseEnter={() => setHoveredSegment('todo')}
                onMouseLeave={() => setHoveredSegment(null)}
                style={{ width: ready ? `${100 - percent}%` : '0%' }}
                className={`h-full bg-rose-300 rounded-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out cursor-pointer ${
                  hoveredSegment === 'done' ? 'opacity-45' : 'opacity-100 hover:brightness-95'
                }`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
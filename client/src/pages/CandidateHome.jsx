import { useEffect, useId, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import { EmptyState, ErrorState, ProgressBar, Spinner, StatusBadge } from '../components/ui'

const STATUSES = ['Not Started', 'In Progress', 'Completed']

const TOP_STRIPE = {
  'Not Started': 'bg-stone-200',
  'In Progress': 'bg-rose-400',
  Completed: 'bg-teal-500',
}

// "My Training": the signed in candidate's own activities. There is no learner picker here,
// because the server finds the learner from the login session.
export default function CandidateHome() {
  const training = useLoad('/me/assignments')

  return (
    <div className="space-y-6">
      {training.status === 'loading' && (
        <div className="py-20 flex justify-center"><Spinner label="Loading your training" /></div>
      )}
      {training.status === 'error' && (
        <ErrorState message={training.error} onRetry={training.reload} />
      )}
      {training.status === 'ready' &&
        (training.data.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-12 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">My Training</h1>
              <p className="mt-1 text-sm text-stone-500">Update the status of each activity as you go.</p>
            </div>
            <EmptyState title="No training assigned yet.">
              Your coordinator will assign activities here.
            </EmptyState>
          </div>
        ) : (
          <TrainingList items={training.data} onUpdated={training.reload} />
        ))}
    </div>
  )
}

function TrainingList({ items, onUpdated }) {
  const [filter, setFilter] = useState('ALL')
  const [topicFilter, setTopicFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [spotlightId, setSpotlightId] = useState(null)
  const [shuffling, setShuffling] = useState(false)

  const count = (status) => items.filter((item) => item.status === status).length
  const completed = count('Completed')
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0
  const totalHours = items.reduce((s, i) => s + (Number(i.activity.plannedHours) || 0), 0)

  const visible = items.filter((item) => {
    const byStatus = filter === 'ALL' || item.status === filter
    const byTopic = topicFilter === 'ALL' || item.activity.topic === topicFilter
    const q = query.trim().toLowerCase()
    const byQuery =
      !q ||
      item.activity.title.toLowerCase().includes(q) ||
      item.activity.topic.toLowerCase().includes(q)
    return byStatus && byTopic && byQuery
  })

  function pickNextToStudy() {
    const pool = visible.filter((i) => i.status !== 'Completed')
    const target = pool.length ? pool : visible
    if (!target.length || shuffling) return
    if (target.length === 1) return setSpotlightId(target[0].id)
    setShuffling(true)
    let ticks = 0
    const timer = setInterval(() => {
      setSpotlightId(target[Math.floor(Math.random() * target.length)].id)
      if (++ticks >= 6) {
        clearInterval(timer)
        setShuffling(false)
      }
    }, 75)
  }

  return (
    <div className="space-y-6">
      {/* Top 2-Column Bento Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Bento: Header + Progress Summary */}
        <section
          className="lg:col-span-5 flex flex-col justify-between gap-5 bg-gradient-to-br from-teal-50/70 via-white to-rose-50/70 border border-stone-200 rounded-3xl p-6 shadow-xs"
          aria-labelledby="progress-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wide text-teal-700">Personal Workspace</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
                My Training
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600">
                Update the status of each activity as you go.
              </p>
            </div>
            <span className="font-mono text-2xl sm:text-3xl font-black text-teal-700 tabular-nums shrink-0">
              {pct}%
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
              <h2 id="progress-heading">Your progress</h2>
              <span className="tabular-nums">
                {completed}/{items.length} done · {Number(totalHours.toFixed(1))} h total
              </span>
            </div>
            <ProgressBar value={completed} max={items.length} label="Completed activities" />
          </div>

          {/* Clickable Status Tiles */}
          <ul className="grid grid-cols-3 gap-2">
            {STATUSES.map((status) => {
              const active = filter === status
              return (
                <li key={status}>
                  <button
                    type="button"
                    onClick={() => setFilter((prev) => (prev === status ? 'ALL' : status))}
                    className={`w-full flex flex-col items-start gap-1.5 p-3 rounded-2xl border motion-safe:transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 -translate-y-0.5 shadow-xs'
                        : 'bg-white/80 border-stone-200/80 hover:bg-white hover:border-stone-300'
                    }`}
                  >
                    <strong className="text-lg font-extrabold text-stone-900 tabular-nums leading-none">
                      {count(status)}
                    </strong>
                    <StatusBadge status={status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Right Bento: Animated Learning Graph + Study Picker */}
        <section className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-stone-900">
                Activity Momentum
              </h2>
              <p className="text-xs text-stone-500">
                Click any topic column to filter your training cards.
              </p>
            </div>

            {visible.length > 0 && (
              <button
                type="button"
                onClick={pickNextToStudy}
                disabled={shuffling}
                className="group inline-flex items-center gap-2 px-4 py-2 min-h-[38px] text-xs font-bold text-rose-950 bg-rose-100 border border-rose-200 rounded-xl hover:bg-rose-200/80 hover:-translate-y-0.5 active:scale-95 motion-safe:transition-all duration-150 whitespace-nowrap cursor-pointer"
              >
                <svg
                  className={`w-3.5 h-3.5 text-rose-600 ${shuffling ? 'motion-safe:animate-spin' : 'group-hover:rotate-12 motion-safe:transition-transform'}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true"
                >
                  <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
                  <path d="m18 2 4 4-4 4M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8m3.7-1.4 4 4-4 4" />
                </svg>
                {shuffling ? 'Picking…' : 'Pick next to study'}
              </button>
            )}
          </div>

          <AnimatedTopicGraph
            items={items}
            pct={pct}
            activeTopic={topicFilter}
            onSelectTopic={(t) => setTopicFilter((prev) => (prev === t ? 'ALL' : t))}
          />
        </section>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl p-3.5 shadow-xs">
        <div className="group flex-1 max-w-md flex items-center gap-3.5 px-4 min-h-[42px] bg-stone-50 border border-stone-200 rounded-xl focus-within:bg-white focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/15 focus-within:-translate-y-0.5 motion-safe:transition-all duration-200">
          <svg className="w-4 h-4 shrink-0 text-stone-400 group-focus-within:text-teal-600 group-focus-within:scale-110 motion-safe:transition-all duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your training modules..."
            aria-label="Search your training"
            className="w-full py-1.5 text-sm font-medium text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className={`w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-lg bg-stone-200/80 text-stone-600 hover:bg-teal-600 hover:text-white active:scale-90 motion-safe:transition-all duration-150 cursor-pointer ${
              query ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', ...STATUSES].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-xl motion-safe:transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Training Cards Grid */}
      {visible.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-10 text-center space-y-3">
          <p className="text-sm font-bold text-stone-900">No training activities match your filter.</p>
          <button
            type="button"
            onClick={() => { setFilter('ALL'); setTopicFilter('ALL'); setQuery('') }}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-95 motion-safe:transition-all cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((item) => (
            <TrainingItem
              key={item.id}
              item={item}
              onUpdated={onUpdated}
              spotlighted={spotlightId === item.id}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AnimatedTopicGraph({ items, pct, activeTopic, onSelectTopic }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(id)
  }, [])

  const topics = [...new Set(items.map((i) => i.activity.topic).filter(Boolean))]
  const groups = topics.map((topic) => {
    const list = items.filter((i) => i.activity.topic === topic)
    const done = list.filter((i) => i.status === 'Completed').length
    const active = list.filter((i) => i.status === 'In Progress').length
    return { topic, total: list.length, done, active }
  })

  const maxCount = Math.max(1, ...groups.map((g) => g.total))
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * (ready ? pct : 0)) / 100

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-stone-50/80 border border-stone-200/70 rounded-2xl">
      {/* Animated Radial Gauge */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="relative w-22 h-22">
          <svg className="w-22 h-22 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
            <circle cx="42" cy="42" r={r} fill="none" stroke="#e7e5e4" strokeWidth="8" />
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke="#0d9488"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-stone-900 font-mono tabular-nums">
            {pct}%
          </span>
        </div>
        {activeTopic !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectTopic('ALL')}
            className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
          >
            Clear topic
          </button>
        )}
      </div>

      {/* Staggered Vertical Topic Bars */}
      <div className="flex-1 w-full space-y-2">
        <div className="flex items-center justify-end gap-3 text-[11px] font-semibold text-stone-500">
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-xs bg-teal-500" /> Done</span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-xs bg-rose-400" /> Active</span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-xs bg-stone-300" /> Todo</span>
        </div>

        <div className="grid gap-3 items-end h-28" style={{ gridTemplateColumns: `repeat(${Math.max(1, groups.length)}, minmax(0, 1fr))` }}>
          {groups.map((g, idx) => {
            const barPct = Math.max(24, Math.round((g.total / maxCount) * 100))
            const donePct = Math.round((g.done / g.total) * 100)
            const activePct = Math.round((g.active / g.total) * 100)
            const selected = activeTopic === g.topic

            return (
              <button
                key={g.topic}
                type="button"
                onClick={() => onSelectTopic(g.topic)}
                title={`${g.topic}: ${g.done}/${g.total} completed`}
                className={`group flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer focus-visible:outline-none ${
                  activeTopic !== 'ALL' && !selected ? 'opacity-35' : 'opacity-100'
                }`}
              >
                <div className="w-full max-w-[40px] flex-1 flex items-end">
                  <div
                    style={{
                      height: `${barPct}%`,
                      transform: ready ? 'scaleY(1)' : 'scaleY(0)',
                      transitionDelay: `${idx * 80}ms`,
                    }}
                    className={`w-full origin-bottom rounded-t-xl bg-stone-200 overflow-hidden flex flex-col justify-end motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out group-hover:brightness-95 ${
                      selected ? 'ring-2 ring-teal-600 ring-offset-1' : ''
                    }`}
                  >
                    <div style={{ height: `${activePct}%` }} className="w-full bg-rose-400" />
                    <div style={{ height: `${donePct}%` }} className="w-full bg-teal-500" />
                  </div>
                </div>
                <span className="w-full truncate text-center text-[11px] font-semibold text-stone-700 group-hover:text-teal-700">
                  {g.topic}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TrainingItem({ item, onUpdated, spotlighted }) {
  const selectId = useId()
  const [draft, setDraft] = useState(item.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [focusOpen, setFocusOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const changed = draft !== item.status

  useEffect(() => {
    if (spotlighted) setFocusOpen(true)
  }, [spotlighted])

  useEffect(() => {
    if (!running || !focusOpen) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [running, focusOpen])

  function handleChange(event) {
    setDraft(event.target.value)
    setMessage({ type: '', text: '' })
  }

  async function handleSave() {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.patch(`/assignments/${item.id}/status`, { status: draft })
      setMessage({ type: 'success', text: 'Saved' })
      onUpdated()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')

  return (
    <li
      className={`bg-white border rounded-3xl overflow-hidden flex flex-col justify-between motion-safe:transition-all duration-200 ${
        spotlighted
          ? 'border-teal-500 ring-4 ring-teal-500/15 shadow-md -translate-y-0.5'
          : 'border-stone-200 hover:border-teal-300 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className={`h-1.5 w-full ${TOP_STRIPE[item.status] || 'bg-stone-200'}`} />

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold tracking-tight text-stone-900">
              {item.activity.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-stone-500 tabular-nums">
              {item.activity.topic} · {item.activity.plannedHours} planned hours
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="pt-3 border-t border-stone-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor={selectId} className="sr-only">Status</label>
              <select
                id={selectId}
                value={draft}
                onChange={handleChange}
                className="px-3 py-2 min-h-[38px] text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSave}
                disabled={!changed || saving}
                className="px-3.5 py-2 min-h-[38px] text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none motion-safe:transition-all duration-150 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFocusOpen((o) => !o)}
              className={`px-3 py-2 min-h-[38px] text-xs font-bold rounded-xl motion-safe:transition-all duration-150 active:scale-95 cursor-pointer ${
                focusOpen ? 'bg-stone-900 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              {focusOpen ? 'Hide timer' : 'Timer'}
            </button>
          </div>

          {message.text && (
            <p
              role="status"
              className={`text-xs font-semibold ${
                message.type === 'success' ? 'text-teal-700' : 'text-rose-600'
              }`}
            >
              {message.type === 'success' ? '✓ Saved' : message.text}
            </p>
          )}
        </div>
      </div>

      {focusOpen && (
        <div className="px-5 py-3 bg-rose-50/70 border-t border-rose-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-rose-900">Session</span>
            <span className="font-mono text-base font-extrabold text-stone-900 tabular-nums">
              {mins}:{secs}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className={`px-3.5 py-1.5 min-h-[34px] text-xs font-bold rounded-xl active:scale-95 motion-safe:transition-all cursor-pointer ${
                running ? 'bg-rose-200 text-rose-950' : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {running ? 'Pause' : seconds > 0 ? 'Resume' : 'Start'}
            </button>
            {seconds > 0 && (
              <button
                type="button"
                onClick={() => { setRunning(false); setSeconds(0) }}
                className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
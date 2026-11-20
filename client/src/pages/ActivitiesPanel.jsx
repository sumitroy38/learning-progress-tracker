import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import { Banner, EmptyState, ErrorState, Spinner, TextField } from '../components/ui'

const ACCENTS = [
  { badge: 'bg-teal-100 text-teal-900 border-teal-200', bar: 'bg-teal-500' },
  { badge: 'bg-rose-100 text-rose-900 border-rose-200', bar: 'bg-rose-400' },
  { badge: 'bg-emerald-100 text-emerald-900 border-emerald-200', bar: 'bg-emerald-500' },
  { badge: 'bg-orange-100 text-orange-900 border-orange-200', bar: 'bg-orange-400' },
  { badge: 'bg-stone-200 text-stone-900 border-stone-300', bar: 'bg-stone-500' },
]

export default function ActivitiesPanel() {
  const activities = useLoad('/activities')
  const [editing, setEditing] = useState(null) // null, "new", or the activity being edited
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('default')

  function startAdd() {
    setSuccess('')
    setEditing('new')
  }

  function startEdit(activity) {
    setSuccess('')
    setEditing(activity)
  }

  function handleSaved(saved, wasNew) {
    setEditing(null)
    setSuccess(wasNew ? `Added "${saved.title}".` : `Saved your changes to "${saved.title}".`)
    activities.reload()
  }

  const items = activities.status === 'ready' ? activities.data : []
  const topics = [...new Set(items.map((a) => a.topic).filter(Boolean))]
  const totalHours = items.reduce((sum, a) => sum + (Number(a.plannedHours) || 0), 0)
  const maxHours = Math.max(1, ...items.map((a) => Number(a.plannedHours) || 0))
  const accentFor = (topic) => ACCENTS[Math.max(0, topics.indexOf(topic)) % ACCENTS.length]

  const filtered = items
    .filter((a) => {
      const byTopic = topicFilter === 'ALL' || a.topic === topicFilter
      const q = query.trim().toLowerCase()
      return byTopic && (!q || a.title.toLowerCase().includes(q) || a.topic.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (sortBy === 'hours-desc') return Number(b.plannedHours) - Number(a.plannedHours)
      if (sortBy === 'hours-asc') return Number(a.plannedHours) - Number(b.plannedHours)
      if (sortBy === 'alpha') return a.title.localeCompare(b.title)
      return 0
    })

  return (
    <section
      className="bg-white border border-stone-200 rounded-3xl shadow-xs overflow-hidden"
      aria-labelledby="activities-heading"
    >
      {/* Coordinator Header */}
      <div className="bg-gradient-to-br from-teal-50/80 via-white to-rose-50/70 px-6 py-6 sm:px-8 border-b border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-teal-700">Training Catalog</p>
            <h2 id="activities-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Activities
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Create and organize training modules ready to assign across your team.
            </p>
          </div>

          {editing === null && (
            <button
              type="button"
              onClick={startAdd}
              className="group inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-bold text-white bg-teal-600 rounded-2xl shadow-xs hover:bg-teal-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-safe:transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4 motion-safe:transition-transform duration-200 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add activity
            </button>
          )}
        </div>

        {/* Catalog Metrics + Interactive Topic Distribution Bar */}
        {activities.status === 'ready' && items.length > 0 && (
          <div className="mt-5 pt-5 border-t border-stone-200/80 space-y-4">
            <div className="flex flex-wrap items-center gap-8 sm:gap-12">
              <div>
                <p className="text-xs font-medium text-stone-500">Activities</p>
                <p className="text-2xl font-extrabold text-stone-900 tabular-nums">{items.length}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500">Topics</p>
                <p className="text-2xl font-extrabold text-stone-900 tabular-nums">{topics.length}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500">Total Planned</p>
                <p className="text-2xl font-extrabold text-teal-700 font-mono tabular-nums">
                  {Number(totalHours.toFixed(2))} h
                </p>
              </div>
            </div>

            {topics.length > 1 && totalHours > 0 && (
              <div className="flex h-2 w-full rounded-full bg-stone-100 overflow-hidden gap-0.5" aria-label="Planned hours by topic">
                {topics.map((topic) => {
                  const hrs = items.filter((a) => a.topic === topic).reduce((s, a) => s + (Number(a.plannedHours) || 0), 0)
                  const pct = Math.max(4, (hrs / totalHours) * 100)
                  const dimmed = topicFilter !== 'ALL' && topicFilter !== topic
                  return (
                    <button
                      key={topic}
                      type="button"
                      title={`${topic}: ${Number(hrs.toFixed(2))} h`}
                      aria-label={`Filter by ${topic}`}
                      onClick={() => setTopicFilter((prev) => (prev === topic ? 'ALL' : topic))}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${accentFor(topic).bar} rounded-full motion-safe:transition-all duration-300 hover:brightness-95 cursor-pointer ${dimmed ? 'opacity-25' : 'opacity-100'}`}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {success && (
        <div className="px-6 pt-5 sm:px-8">
          <Banner type="success" onDismiss={() => setSuccess('')}>{success}</Banner>
        </div>
      )}

      {editing !== null && (
        <ActivityForm
          key={editing === 'new' ? 'new' : editing.id}
          activity={editing === 'new' ? null : editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Search, Sort & Topic Filters */}
      {activities.status === 'ready' && items.length > 0 && (
        <div className="px-6 py-4 sm:px-8 bg-stone-50/70 border-b border-stone-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="group flex-1 max-w-md flex items-center gap-3.5 px-4 min-h-[44px] bg-white border border-stone-200 rounded-2xl shadow-xs hover:border-stone-300 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/15 focus-within:-translate-y-0.5 motion-safe:transition-all duration-200">
              <svg className="w-4 h-4 shrink-0 text-stone-400 group-focus-within:text-teal-600 group-focus-within:scale-110 motion-safe:transition-all duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search activities or topics..."
                aria-label="Search activities"
                className="w-full py-2 text-sm font-medium text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className={`w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-teal-600 hover:text-white active:scale-90 motion-safe:transition-all duration-150 cursor-pointer ${
                  query ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <label htmlFor="activity-sort" className="text-xs font-medium text-stone-500">Sort by</label>
              <select
                id="activity-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-2 min-h-[42px] text-xs font-semibold text-stone-800 bg-white border border-stone-200 rounded-xl hover:border-stone-300 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="default">Default order</option>
                <option value="hours-desc">Most hours</option>
                <option value="hours-asc">Least hours</option>
                <option value="alpha">Title A–Z</option>
              </select>
            </div>
          </div>

          {topics.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Filter by topic">
              <button
                type="button"
                role="tab"
                aria-selected={topicFilter === 'ALL'}
                onClick={() => setTopicFilter('ALL')}
                className={`px-3.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-xl motion-safe:transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                  topicFilter === 'ALL' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900'
                }`}
              >
                All topics
              </button>
              {topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  role="tab"
                  aria-selected={topicFilter === topic}
                  onClick={() => setTopicFilter(topic)}
                  className={`px-3.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-xl motion-safe:transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                    topicFilter === topic ? 'bg-teal-600 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activities.status === 'loading' && (
        <div className="px-6 py-16 flex justify-center"><Spinner label="Loading activities" /></div>
      )}

      {activities.status === 'error' && (
        <div className="p-6 sm:p-8"><ErrorState message={activities.error} onRetry={activities.reload} /></div>
      )}

      {activities.status === 'ready' &&
        (items.length === 0 ? (
          <div className="p-8 sm:p-12">
            <EmptyState title="No activities yet">Add your first activity so you can assign training.</EmptyState>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm font-bold text-stone-900">No activities match your filter.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setTopicFilter('ALL') }}
              className="px-4 py-2 min-h-[38px] text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-95 motion-safe:transition-all cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <ul className="p-4 sm:p-6 grid grid-cols-1 gap-3 bg-stone-50/40">
            {filtered.map((activity, index) => {
              const accent = accentFor(activity.topic)
              const widthPct = Math.min(100, Math.max(10, Math.round(((Number(activity.plannedHours) || 0) / maxHours) * 100)))
              const isEditing = editing && editing !== 'new' && editing.id === activity.id

              return (
                <li
                  key={activity.id}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white border rounded-2xl motion-safe:transition-all duration-200 ${
                    isEditing
                      ? 'border-rose-400 ring-2 ring-rose-400/20 shadow-sm'
                      : 'border-stone-200/90 hover:border-teal-300 hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border text-xs font-bold font-mono motion-safe:transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-3 shrink-0 tabular-nums ${accent.badge}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold tracking-tight text-stone-900 truncate group-hover:text-teal-800 motion-safe:transition-colors">
                        <Highlight text={activity.title} query={query} />
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-stone-500 truncate">
                        <Highlight text={activity.topic} query={query} />
                        <span className="sm:hidden font-mono tabular-nums text-stone-700"> · {activity.plannedHours} h</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-1.5 w-28">
                      <p className="font-mono text-sm font-bold text-stone-800 tabular-nums whitespace-nowrap">
                        {activity.plannedHours} h
                      </p>
                      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden" aria-hidden="true">
                        <div
                          className={`h-full ${accent.bar} rounded-full origin-left motion-safe:transition-transform duration-300 group-hover:scale-x-105`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEdit(activity)}
                      aria-label={`Edit ${activity.title}`}
                      className="inline-flex items-center justify-center px-4 py-2 min-h-[38px] text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 active:scale-95 motion-safe:transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ))}
    </section>
  )
}

function Highlight({ text, query }) {
  const q = query.trim()
  if (!q) return text
  const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-teal-100 text-teal-950 rounded px-0.5 font-bold">{part}</mark>
      : part
  )
}

// A compact form for adding or editing one activity
function ActivityForm({ activity, onSaved, onCancel }) {
  const isNew = activity === null
  const [title, setTitle] = useState(activity ? activity.title : '')
  const [topic, setTopic] = useState(activity ? activity.topic : '')
  const [hours, setHours] = useState(activity ? String(activity.plannedHours) : '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  function validate() {
    const found = {}
    if (!title.trim()) found.title = 'Title is required.'
    if (!topic.trim()) found.topic = 'Topic is required.'
    const number = Number(hours)
    if (hours.trim() === '') found.hours = 'Planned hours is required.'
    else if (!Number.isFinite(number)) found.hours = 'Planned hours must be a number.'
    else if (number <= 0) found.hours = 'Planned hours must be greater than zero.'
    else if (number < 0.01) found.hours = 'Planned hours must be at least 0.01.'
    else if (number > 999) found.hours = 'Planned hours must be 999 or less.'
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    const body = { title: title.trim(), topic: topic.trim(), plannedHours: Number(hours) }
    try {
      const saved = isNew ? await api.post('/activities', body) : await api.put(`/activities/${activity.id}`, body)
      onSaved(saved, isNew)
    } catch (err) {
      setFormError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="bg-stone-50 border-b border-stone-200 px-6 py-6 sm:px-8 space-y-5" onSubmit={handleSubmit} noValidate aria-label={isNew ? 'Add activity' : 'Edit activity'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-stone-900">{isNew ? 'Add activity' : 'Edit activity'}</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {isNew ? 'Add a module so coordinators can assign it to learners.' : `Updating "${activity.title}"`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Close form"
          className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-900 hover:bg-white motion-safe:transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {formError && <Banner type="error">{formError}</Banner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-5">
          <TextField label="Title" name="title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} inputRef={firstRef} />
        </div>
        <div className="lg:col-span-4">
          <TextField label="Topic" name="topic" maxLength={60} value={topic} onChange={(e) => setTopic(e.target.value)} error={errors.topic} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3 space-y-2">
          <TextField label="Planned hours" name="plannedHours" type="number" inputMode="decimal" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} error={errors.hours} />
          <div className="flex items-center gap-1.5 flex-wrap">
            {['0.5', '1', '2', '5', '10'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setHours(preset)}
                className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg border active:scale-95 motion-safe:transition-all cursor-pointer ${
                  hours === preset ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-stone-600 border-stone-200 hover:border-teal-300'
                }`}
              >
                {preset}h
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 min-h-[42px] text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 motion-safe:transition-all whitespace-nowrap cursor-pointer"
        >
          {saving ? 'Saving…' : isNew ? 'Add activity' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 min-h-[42px] text-sm font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 disabled:opacity-50 motion-safe:transition-all whitespace-nowrap cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
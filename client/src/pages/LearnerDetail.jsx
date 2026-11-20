import { useEffect, useId, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import { Banner, EmptyState, ErrorState, ProgressBar, Spinner, StatusBadge } from '../components/ui'

const STATUS_FILTERS = ['ALL', 'Not Started', 'In Progress', 'Completed']

// One candidate's progress, with the coordinator only actions: assign training and reset password
export default function LearnerDetail({ learner, onChanged, onCredentials }) {
  const assignments = useLoad(`/learners/${learner.id}/assignments`)
  const activities = useLoad('/activities')

  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(id)
  }, [])

  async function handleReset() {
    setResetting(true)
    setResetError('')
    try {
      const result = await api.post(`/learners/${learner.id}/reset-password`)
      setConfirmingReset(false)
      onCredentials(result.credentials)
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetting(false)
    }
  }

  const items = assignments.data || []
  const completed = items.filter((item) => item.status === 'Completed').length
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0
  const totalHours = items.reduce((sum, i) => sum + (Number(i.activity.plannedHours) || 0), 0)
  const visibleItems = items.filter((i) => statusFilter === 'ALL' || i.status === statusFilter)

  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * (ready ? pct : 0)) / 100

  return (
    <section
      className="bg-white border border-stone-200 rounded-3xl shadow-xs overflow-hidden"
      aria-labelledby="detail-heading"
    >
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-teal-50/75 via-white to-rose-50/70 px-6 py-5 sm:px-7 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
            {initials(learner.name)}
          </span>
          <div className="min-w-0">
            <h2 id="detail-heading" className="text-xl font-extrabold tracking-tight text-stone-900 truncate">
              {learner.name}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-stone-500 truncate">
              {learner.email} <span aria-hidden="true">·</span> {learner.cohort}
            </p>
          </div>
        </div>

        {!confirmingReset && (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="px-3.5 py-2 min-h-[38px] text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900 active:scale-95 motion-safe:transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset password
          </button>
        )}
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* Confirm Password Reset Drawer */}
        {confirmingReset && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-3" role="group" aria-label="Confirm password reset">
            <p className="text-sm font-medium text-rose-950">
              Make a new temporary password for <strong>{learner.name}</strong>? The old password stops working, and any open sessions are signed out.
            </p>
            {resetError && <Banner type="error">{resetError}</Banner>}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2 min-h-[38px] text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 active:scale-95 disabled:opacity-50 motion-safe:transition-all cursor-pointer"
              >
                {resetting ? 'Resetting…' : 'Yes, reset password'}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => {
                  setConfirmingReset(false)
                  setResetError('')
                }}
                className="px-4 py-2 min-h-[38px] text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 disabled:opacity-50 motion-safe:transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Progress Overview & Assigned List */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-stone-900">Progress</h3>
              {assignments.status === 'ready' && items.length > 0 && (
                <p className="text-xs font-medium text-stone-500 tabular-nums mt-0.5">
                  {completed} of {items.length} completed · {Number(totalHours.toFixed(1))} h assigned
                </p>
              )}
            </div>

            {assignments.status === 'ready' && items.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
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
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold font-mono text-stone-900 tabular-nums">
                    {pct}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {assignments.status === 'loading' && (
            <div className="py-10 flex justify-center"><Spinner label="Loading progress" /></div>
          )}
          {assignments.status === 'error' && (
            <ErrorState message={assignments.error} onRetry={assignments.reload} />
          )}
          {assignments.status === 'ready' &&
            (items.length === 0 ? (
              <div className="py-4">
                <EmptyState title={`Nothing assigned to ${learner.name} yet.`} />
              </div>
            ) : (
              <>
                <ProgressBar value={completed} max={items.length} label={`${learner.name} completed activities`} />

                {/* Interactive Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  {STATUS_FILTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 min-h-[32px] text-xs font-semibold rounded-xl motion-safe:transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                        statusFilter === s
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                      }`}
                    >
                      {s === 'ALL' ? `All (${items.length})` : s}
                    </button>
                  ))}
                </div>

                {visibleItems.length === 0 ? (
                  <p className="py-6 text-center text-xs font-medium text-stone-500">
                    No {statusFilter.toLowerCase()} activities.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {visibleItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 bg-stone-50/60 border border-stone-200/80 rounded-2xl hover:bg-white hover:border-teal-300 hover:-translate-y-0.5 hover:shadow-xs motion-safe:transition-all duration-150"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-900 truncate">{item.activity.title}</p>
                          <p className="text-xs text-stone-500 truncate">{item.activity.topic}</p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <p className="font-mono text-xs font-semibold text-stone-600 tabular-nums whitespace-nowrap">
                            {item.activity.plannedHours} h
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ))}
        </div>

        <AssignForm
          learner={learner}
          activities={activities}
          assignedIds={new Set(items.map((item) => item.activity.id))}
          assignmentsReady={assignments.status === 'ready'}
          onAssigned={() => {
            assignments.reload()
            onChanged()
          }}
        />
      </div>
    </section>
  )
}

function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
}

function AssignForm({ learner, activities, assignedIds, assignmentsReady, onAssigned }) {
  const selectId = useId()
  const [activityId, setActivityId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (activities.status === 'loading' || !assignmentsReady) return null
  if (activities.status === 'error') {
    return <ErrorState message={activities.error} onRetry={activities.reload} />
  }

  const available = activities.data.filter((activity) => !assignedIds.has(activity.id))
  const chosen = available.find((a) => String(a.id) === String(activityId))

  async function handleSubmit(event) {
    event.preventDefault()
    setSuccess('')
    if (!activityId) {
      setError('Choose an activity to assign.')
      return
    }
    setError('')
    setAssigning(true)
    try {
      const created = await api.post('/assignments', {
        learnerId: learner.id,
        activityId: Number(activityId),
      })
      setSuccess(`Assigned "${created.activity.title}" to ${learner.name}.`)
      setActivityId('')
      onAssigned()
    } catch (err) {
      setError(err.message)
      // The list may be out of date (for example a duplicate), so refresh it
      onAssigned()
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="bg-stone-50/90 border border-stone-200/80 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-stone-900">Assign training</h3>
        {available.length > 0 && (
          <span className="text-[11px] font-semibold text-stone-500 tabular-nums">
            {available.length} available
          </span>
        )}
      </div>

      {success && (
        <Banner type="success" onDismiss={() => setSuccess('')}>
          {success}
        </Banner>
      )}

      {activities.data.length === 0 ? (
        <p className="text-xs text-stone-500">No activities exist yet. Add one in the Activities tab first.</p>
      ) : available.length === 0 ? (
        <p className="text-xs text-stone-500">Every activity is already assigned to {learner.name}.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {error && <Banner type="error">{error}</Banner>}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label htmlFor={selectId} className="block text-xs font-bold text-stone-700">
                Activity
              </label>
              <select
                id={selectId}
                value={activityId}
                onChange={(event) => {
                  setActivityId(event.target.value)
                  setError('')
                }}
                className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-medium text-stone-900 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="">Choose an activity</option>
                {available.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.title} ({activity.plannedHours} h)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={assigning}
              className="px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-95 disabled:opacity-50 motion-safe:transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>

          {chosen && (
            <p className="text-xs text-stone-600">
              Topic: <span className="font-semibold text-stone-900">{chosen.topic}</span> ·{' '}
              <span className="font-mono tabular-nums">{chosen.plannedHours} h</span>
            </p>
          )}
        </form>
      )}
    </div>
  )
}
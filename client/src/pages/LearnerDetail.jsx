import { useId, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import { Banner, EmptyState, ErrorState, ProgressBar, Spinner, StatusBadge } from '../components/ui'

// One candidate's progress, with the coordinator only actions: assign training and reset password
export default function LearnerDetail({ learner, onChanged, onCredentials }) {
  const assignments = useLoad(`/learners/${learner.id}/assignments`)
  const activities = useLoad('/activities')

  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

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

  return (
    <section className="card" aria-labelledby="detail-heading">
      <div className="card-head">
        <div>
          <h2 id="detail-heading">{learner.name}</h2>
          <p className="muted">
            {learner.email} · {learner.cohort}
          </p>
        </div>
        {!confirmingReset && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmingReset(true)}>
            Reset password
          </button>
        )}
      </div>

      {confirmingReset && (
        <div className="confirm-box" role="group" aria-label="Confirm password reset">
          <p>
            Make a new temporary password for {learner.name}? The old password stops working, and any open
            sessions are signed out.
          </p>
          {resetError && <Banner type="error">{resetError}</Banner>}
          <div className="actions">
            <button type="button" className="btn btn-danger" onClick={handleReset} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Yes, reset password'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setConfirmingReset(false)
                setResetError('')
              }}
              disabled={resetting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <h3>Progress</h3>
      {assignments.status === 'loading' && <Spinner label="Loading progress" />}
      {assignments.status === 'error' && <ErrorState message={assignments.error} onRetry={assignments.reload} />}
      {assignments.status === 'ready' &&
        (items.length === 0 ? (
          <EmptyState title={`Nothing assigned to ${learner.name} yet.`} />
        ) : (
          <>
            <p className="progress-text">
              {completed} of {items.length} completed
            </p>
            <ProgressBar value={completed} max={items.length} label={`${learner.name} completed activities`} />
            <ul className="row-list">
              {items.map((item) => (
                <li className="row" key={item.id}>
                  <div className="row-main">
                    <p className="row-title">{item.activity.title}</p>
                    <p className="row-sub">{item.activity.topic}</p>
                  </div>
                  <p className="row-meta">{item.activity.plannedHours} h</p>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </>
        ))}

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
    </section>
  )
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
    <div className="assign">
      <h3>Assign training</h3>
      {success && (
        <Banner type="success" onDismiss={() => setSuccess('')}>
          {success}
        </Banner>
      )}
      {activities.data.length === 0 ? (
        <p className="muted">No activities exist yet. Add one in the Activities tab first.</p>
      ) : available.length === 0 ? (
        <p className="muted">Every activity is already assigned to {learner.name}.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <Banner type="error">{error}</Banner>}
          <div className="assign-row">
            <div className="field">
              <label htmlFor={selectId}>Activity</label>
              <select
                id={selectId}
                value={activityId}
                onChange={(event) => {
                  setActivityId(event.target.value)
                  setError('')
                }}
              >
                <option value="">Choose an activity</option>
                {available.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.title} ({activity.plannedHours} h)
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={assigning}>
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

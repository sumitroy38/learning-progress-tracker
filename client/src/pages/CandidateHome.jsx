import { useId, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import { EmptyState, ErrorState, ProgressBar, Spinner, StatusBadge } from '../components/ui'

const STATUSES = ['Not Started', 'In Progress', 'Completed']

// "My Training": the signed in candidate's own activities. There is no learner picker here,
// because the server finds the learner from the login session.
export default function CandidateHome() {
  const training = useLoad('/me/assignments')

  return (
    <>
      <div className="page-head">
        <h1>My Training</h1>
        <p className="muted">Update the status of each activity as you go.</p>
      </div>

      {training.status === 'loading' && <Spinner label="Loading your training" />}
      {training.status === 'error' && <ErrorState message={training.error} onRetry={training.reload} />}
      {training.status === 'ready' &&
        (training.data.length === 0 ? (
          <EmptyState title="No training assigned yet.">
            Your coordinator will assign activities here.
          </EmptyState>
        ) : (
          <TrainingList items={training.data} onUpdated={training.reload} />
        ))}
    </>
  )
}

function TrainingList({ items, onUpdated }) {
  const count = (status) => items.filter((item) => item.status === status).length
  const completed = count('Completed')

  return (
    <>
      <section className="card" aria-labelledby="progress-heading">
        <h2 id="progress-heading">Your progress</h2>
        <p className="progress-text">
          {completed} of {items.length} completed
        </p>
        <ProgressBar value={completed} max={items.length} label="Completed activities" />
        <ul className="chips">
          {STATUSES.map((status) => (
            <li key={status}>
              <StatusBadge status={status} /> <strong>{count(status)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <ul className="training-list">
        {items.map((item) => (
          <TrainingItem key={item.id} item={item} onUpdated={onUpdated} />
        ))}
      </ul>
    </>
  )
}

function TrainingItem({ item, onUpdated }) {
  const selectId = useId()
  const [draft, setDraft] = useState(item.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const changed = draft !== item.status

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

  return (
    <li className="card training-item">
      <div className="training-top">
        <div>
          <h3>{item.activity.title}</h3>
          <p className="muted">
            {item.activity.topic} · {item.activity.plannedHours} planned hours
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="training-controls">
        <div className="field inline">
          <label htmlFor={selectId}>Status</label>
          <select id={selectId} value={draft} onChange={handleChange}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!changed || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <p className={`save-message ${message.type}`} role="status">
          {message.type === 'success' ? '✓ Saved' : message.text}
        </p>
      </div>
    </li>
  )
}

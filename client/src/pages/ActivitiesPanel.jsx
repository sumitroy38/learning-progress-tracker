import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import { Banner, EmptyState, ErrorState, Spinner, TextField } from '../components/ui'

export default function ActivitiesPanel() {
  const activities = useLoad('/activities')
  const [editing, setEditing] = useState(null) // null, "new", or the activity being edited
  const [success, setSuccess] = useState('')

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

  return (
    <section className="card" aria-labelledby="activities-heading">
      <div className="card-head">
        <h2 id="activities-heading">Activities</h2>
        {editing === null && (
          <button type="button" className="btn btn-primary" onClick={startAdd}>
            Add activity
          </button>
        )}
      </div>

      {success && (
        <Banner type="success" onDismiss={() => setSuccess('')}>
          {success}
        </Banner>
      )}

      {editing !== null && (
        <ActivityForm
          key={editing === 'new' ? 'new' : editing.id}
          activity={editing === 'new' ? null : editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      {activities.status === 'loading' && <Spinner label="Loading activities" />}
      {activities.status === 'error' && <ErrorState message={activities.error} onRetry={activities.reload} />}
      {activities.status === 'ready' &&
        (activities.data.length === 0 ? (
          <EmptyState title="No activities yet">Add your first activity so you can assign training.</EmptyState>
        ) : (
          <ul className="row-list">
            {activities.data.map((activity) => (
              <li className="row" key={activity.id}>
                <div className="row-main">
                  <p className="row-title">{activity.title}</p>
                  <p className="row-sub">{activity.topic}</p>
                </div>
                <p className="row-meta">{activity.plannedHours} h</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => startEdit(activity)}
                  aria-label={`Edit ${activity.title}`}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        ))}
    </section>
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
    <form className="inline-form" onSubmit={handleSubmit} noValidate aria-label={isNew ? 'Add activity' : 'Edit activity'}>
      <h3>{isNew ? 'Add activity' : 'Edit activity'}</h3>
      {formError && <Banner type="error">{formError}</Banner>}
      <div className="form-grid">
        <TextField
          label="Title"
          name="title"
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
          inputRef={firstRef}
        />
        <TextField
          label="Topic"
          name="topic"
          maxLength={60}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          error={errors.topic}
        />
        <TextField
          label="Planned hours"
          name="plannedHours"
          type="number"
          inputMode="decimal"
          step="0.5"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          error={errors.hours}
        />
      </div>
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Add activity' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

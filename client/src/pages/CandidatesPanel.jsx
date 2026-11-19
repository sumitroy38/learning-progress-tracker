import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useLoad } from '../useLoad'
import CredentialsPanel from '../components/CredentialsPanel'
import { Banner, EmptyState, ErrorState, Spinner, TextField } from '../components/ui'
import LearnerDetail from './LearnerDetail'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CandidatesPanel({ onChanged }) {
  const learners = useLoad('/learners')
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [issued, setIssued] = useState(null) // one time credentials, kept only in memory

  const selected = learners.data ? learners.data.find((learner) => learner.id === selectedId) : null

  function showCredentials(name, credentials) {
    setIssued({ name, ...credentials, issuedAt: Date.now() })
  }

  function handleCreated(result) {
    setAdding(false)
    showCredentials(result.learner.name, result.credentials)
    setSelectedId(result.learner.id)
    learners.reload()
    onChanged()
  }

  return (
    <>
      {issued && <CredentialsPanel key={issued.issuedAt} issued={issued} onDismiss={() => setIssued(null)} />}

      <div className="split">
        <section className="card" aria-labelledby="candidates-heading">
          <div className="card-head">
            <h2 id="candidates-heading">Candidates</h2>
            {!adding && (
              <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                Add candidate
              </button>
            )}
          </div>

          {adding && <AddCandidateForm onCreated={handleCreated} onCancel={() => setAdding(false)} />}

          {learners.status === 'loading' && <Spinner label="Loading candidates" />}
          {learners.status === 'error' && <ErrorState message={learners.error} onRetry={learners.reload} />}
          {learners.status === 'ready' &&
            (learners.data.length === 0 ? (
              <EmptyState title="No candidates yet">Add your first candidate to get started.</EmptyState>
            ) : (
              <ul className="learner-list">
                {learners.data.map((learner) => (
                  <li key={learner.id}>
                    <button
                      type="button"
                      className={learner.id === selectedId ? 'learner-item active' : 'learner-item'}
                      aria-current={learner.id === selectedId ? 'true' : undefined}
                      onClick={() => setSelectedId(learner.id)}
                    >
                      <span className="learner-name">{learner.name}</span>
                      <span className="learner-sub">{learner.email}</span>
                      <span className="learner-sub">{learner.cohort}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </section>

        <div>
          {selected ? (
            <LearnerDetail
              key={selected.id}
              learner={selected}
              onChanged={onChanged}
              onCredentials={(credentials) => showCredentials(selected.name, credentials)}
            />
          ) : (
            <section className="card">
              <EmptyState title="Select a candidate">
                Choose someone from the list to see their progress and assign training.
              </EmptyState>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

function AddCandidateForm({ onCreated, onCancel }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cohort, setCohort] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  function validate() {
    const found = {}
    if (!name.trim()) found.name = 'Name is required.'
    if (!email.trim()) found.email = 'Email is required.'
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = 'Please enter a valid email address.'
    if (!cohort.trim()) found.cohort = 'Cohort is required.'
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const result = await api.post('/learners', {
        name: name.trim(),
        email: email.trim(),
        cohort: cohort.trim(),
      })
      onCreated(result)
    } catch (err) {
      if (err.status === 409) {
        // Shown right under the email box, as the brief asks
        setErrors({ email: err.message })
      } else {
        setFormError(err.message)
      }
      setSaving(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit} noValidate aria-label="Add candidate">
      <h3>Add candidate</h3>
      {formError && <Banner type="error">{formError}</Banner>}
      <TextField
        label="Name"
        name="name"
        autoComplete="off"
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        inputRef={firstRef}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <TextField
        label="Cohort"
        name="cohort"
        autoComplete="off"
        maxLength={60}
        value={cohort}
        onChange={(event) => setCohort(event.target.value)}
        error={errors.cohort}
      />
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create account'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

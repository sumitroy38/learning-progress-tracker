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
  const [query, setQuery] = useState('')
  const [cohortFilter, setCohortFilter] = useState('ALL')

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

  const items = learners.status === 'ready' ? learners.data : []
  const cohorts = [...new Set(items.map((l) => l.cohort).filter(Boolean))]
  const filtered = items.filter((l) => {
    const byCohort = cohortFilter === 'ALL' || l.cohort === cohortFilter
    const q = query.trim().toLowerCase()
    return byCohort && (!q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.cohort.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6">
      {issued && <CredentialsPanel key={issued.issuedAt} issued={issued} onDismiss={() => setIssued(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Roster Panel */}
        <section
          className="lg:col-span-5 xl:col-span-4 bg-white border border-stone-200 rounded-3xl shadow-xs overflow-hidden"
          aria-labelledby="candidates-heading"
        >
          <div className="bg-gradient-to-br from-teal-50/75 via-white to-rose-50/70 px-5 py-5 border-b border-stone-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wide text-teal-700">Roster</p>
              <div className="flex items-baseline gap-2.5">
                <h2 id="candidates-heading" className="text-xl font-extrabold tracking-tight text-stone-900">
                  Candidates
                </h2>
                {learners.status === 'ready' && items.length > 0 && (
                  <span className="text-xs font-semibold text-stone-500 tabular-nums">{items.length}</span>
                )}
              </div>
            </div>

            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="group inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] text-xs font-bold text-white bg-teal-600 rounded-xl shadow-xs hover:bg-teal-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-safe:transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 motion-safe:transition-transform duration-200 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add candidate
              </button>
            )}
          </div>

          {adding && <AddCandidateForm onCreated={handleCreated} onCancel={() => setAdding(false)} />}

          {/* Search & Cohort Filter */}
          {learners.status === 'ready' && items.length > 0 && (
            <div className="p-4 bg-stone-50/70 border-b border-stone-200/80 space-y-2.5">
              <div className="group flex items-center gap-3.5 px-3.5 min-h-[40px] bg-white border border-stone-200 rounded-xl focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/15 focus-within:-translate-y-0.5 motion-safe:transition-all duration-200">
                <svg className="w-4 h-4 shrink-0 text-stone-400 group-focus-within:text-teal-600 group-focus-within:scale-110 motion-safe:transition-all duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search candidates or cohorts..."
                  aria-label="Search candidates"
                  className="w-full py-1.5 text-sm font-medium text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className={`w-5 h-5 shrink-0 inline-flex items-center justify-center rounded-md bg-stone-100 text-stone-500 hover:bg-teal-600 hover:text-white active:scale-90 motion-safe:transition-all duration-150 cursor-pointer ${
                    query ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {cohorts.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Filter by cohort">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={cohortFilter === 'ALL'}
                    onClick={() => setCohortFilter('ALL')}
                    className={`px-3 py-1 min-h-[30px] text-[11px] font-semibold rounded-lg motion-safe:transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      cohortFilter === 'ALL' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900'
                    }`}
                  >
                    All
                  </button>
                  {cohorts.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={cohortFilter === c}
                      onClick={() => setCohortFilter(c)}
                      className={`px-3 py-1 min-h-[30px] text-[11px] font-semibold rounded-lg motion-safe:transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        cohortFilter === c ? 'bg-teal-600 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {learners.status === 'loading' && (
            <div className="py-12 flex justify-center"><Spinner label="Loading candidates" /></div>
          )}
          {learners.status === 'error' && (
            <div className="p-5"><ErrorState message={learners.error} onRetry={learners.reload} /></div>
          )}
          {learners.status === 'ready' &&
            (items.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No candidates yet">Add your first candidate to get started.</EmptyState>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center space-y-2.5">
                <p className="text-sm font-bold text-stone-900">No candidates match your filter.</p>
                <button
                  type="button"
                  onClick={() => { setQuery(''); setCohortFilter('ALL') }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <ul className="p-3 space-y-1.5 max-h-[600px] overflow-y-auto">
                {filtered.map((learner) => {
                  const active = learner.id === selectedId
                  return (
                    <li key={learner.id}>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => setSelectedId(learner.id)}
                        className={`group w-full flex items-center gap-3.5 p-3 rounded-2xl border text-left motion-safe:transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/15 shadow-xs'
                            : 'bg-white border-transparent hover:bg-stone-50 hover:border-stone-200 hover:-translate-y-0.5'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 motion-safe:transition-transform duration-150 group-hover:scale-105 ${
                            active ? 'bg-teal-600 text-white' : 'bg-rose-100/80 text-rose-900 group-hover:bg-teal-100 group-hover:text-teal-900'
                          }`}
                        >
                          {initials(learner.name)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-stone-900 truncate">{learner.name}</p>
                          <p className="mt-0.5 text-xs text-stone-500 truncate">
                            {learner.email} <span aria-hidden="true">·</span> {learner.cohort}
                          </p>
                        </div>

                        <svg
                          className={`w-4 h-4 shrink-0 motion-safe:transition-transform duration-150 ${
                            active ? 'text-teal-700 translate-x-0.5' : 'text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5'
                          }`}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ))}
        </section>

        {/* Right Detail Panel */}
        <div className="lg:col-span-7 xl:col-span-8">
          {selected ? (
            <LearnerDetail
              key={selected.id}
              learner={selected}
              onChanged={onChanged}
              onCredentials={(credentials) => showCredentials(selected.name, credentials)}
            />
          ) : (
            <section className="bg-gradient-to-br from-stone-50 via-white to-teal-50/40 border border-stone-200 rounded-3xl p-8 sm:p-14 shadow-xs text-center">
              <EmptyState title="Select a candidate">
                Choose someone from the list to see their progress and assign training.
              </EmptyState>
            </section>
          )}
        </div>
      </div>
    </div>
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
    <form className="bg-stone-50/90 border-b border-stone-200 p-5 space-y-4" onSubmit={handleSubmit} noValidate aria-label="Add candidate">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-stone-900">Add candidate</h3>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Close form"
          className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {formError && <Banner type="error">{formError}</Banner>}

      <div className="space-y-3">
        <TextField label="Name" name="name" autoComplete="off" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} inputRef={firstRef} />
        <TextField label="Email" name="email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField label="Cohort" name="cohort" autoComplete="off" maxLength={60} value={cohort} onChange={(e) => setCohort(e.target.value)} error={errors.cohort} />
      </div>

      <div className="flex items-center gap-2.5 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:scale-95 disabled:opacity-50 motion-safe:transition-all cursor-pointer"
        >
          {saving ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 min-h-[40px] text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 disabled:opacity-50 motion-safe:transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
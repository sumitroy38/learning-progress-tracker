import { useState } from 'react'
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
    <>
      <div className="page-head">
        <h1>Cohort dashboard</h1>
        <p className="muted">Add candidates, assign training and follow progress.</p>
      </div>

      <SummaryTiles summary={summary} />

      <nav className="tabs" aria-label="Dashboard sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'tab active' : 'tab'}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'candidates' ? <CandidatesPanel onChanged={summary.reload} /> : <ActivitiesPanel />}
    </>
  )
}

function SummaryTiles({ summary }) {
  if (summary.status === 'error' && !summary.data) {
    return <ErrorState message={summary.error} onRetry={summary.reload} />
  }

  const data = summary.data
  const percent = data && data.assignments > 0 ? Math.round((data.completed / data.assignments) * 100) : 0

  return (
    <section className="tiles" aria-label="Cohort summary" aria-busy={summary.status === 'loading'}>
      <div className="tile">
        <p className="tile-label">Learners</p>
        <p className="tile-value">{data ? data.learners : '…'}</p>
      </div>
      <div className="tile">
        <p className="tile-label">Assignments</p>
        <p className="tile-value">{data ? data.assignments : '…'}</p>
      </div>
      <div className="tile">
        <p className="tile-label">Completed</p>
        <p className="tile-value">{data ? data.completed : '…'}</p>
        {data && (
          <>
            <ProgressBar value={data.completed} max={data.assignments} label="Completed assignments" />
            <p className="tile-note">{percent}% of assignments</p>
          </>
        )}
      </div>
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

// Loads data from the server and tracks its state: "loading", "ready" or "error".
// Calling reload() asks again, and keeps the old data on screen while waiting.
export function useLoad(path) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get(path)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: '' })
      })
      .catch((err) => {
        if (!cancelled) setState((previous) => ({ ...previous, status: 'error', error: err.message }))
      })
    return () => {
      cancelled = true
    }
  }, [path, attempt])

  const reload = useCallback(() => {
    setState((previous) =>
      previous.status === 'ready' ? previous : { ...previous, status: 'loading', error: '' },
    )
    setAttempt((count) => count + 1)
  }, [])

  return { ...state, reload }
}

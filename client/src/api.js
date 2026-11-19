// Talks to the Express server. Every call goes to /api, which Vite passes on to port 4000.

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let onSessionEnded = () => {}

// App.jsx tells us what to do when the server says "please sign in" (for example, the session expired)
export function setSessionEndedHandler(handler) {
  onSessionEnded = handler
}

const OFFLINE_MESSAGE = 'Cannot reach the server. Check your connection and try again.'

// A CSRF token is a one time proof that the request comes from our own app.
// It is tied to the current session, so we ask for a fresh one before every change.
async function fetchCsrfToken() {
  let response
  try {
    response = await fetch('/api/v1/auth/csrf-token', { credentials: 'same-origin' })
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0)
  }
  if (!response.ok) {
    throw new ApiError('The server did not answer correctly. Please try again.', response.status)
  }
  const data = await response.json()
  return data.csrfToken
}

async function request(method, path, body, options = {}) {
  const { redirectOnUnauthorized = true } = options
  const init = { method, credentials: 'same-origin', headers: {} }

  if (method !== 'GET') {
    init.headers['Content-Type'] = 'application/json'
    init.headers['x-csrf-token'] = await fetchCsrfToken()
    init.body = JSON.stringify(body ?? {})
  }

  let response
  try {
    response = await fetch(`/api/v1${path}`, init)
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0)
  }

  // 204 means "done, nothing to send back"
  if (response.status === 204) return null

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    if (response.status === 401 && redirectOnUnauthorized) onSessionEnded()
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', response.status)
  }
  return data
}

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body, options) => request('POST', path, body, options),
  put: (path, body, options) => request('PUT', path, body, options),
  patch: (path, body, options) => request('PATCH', path, body, options),
}

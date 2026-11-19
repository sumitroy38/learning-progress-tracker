import { useEffect, useRef, useState } from 'react'

// Shows one time credentials to the coordinator for private handover.
// They live only in this screen's memory. Close the panel and they are gone for good.
export default function CredentialsPanel({ issued, onDismiss }) {
  const panelRef = useRef(null)
  const [copyMessage, setCopyMessage] = useState('')

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword)
      setCopyMessage('Password copied.')
    } catch {
      setCopyMessage('Could not copy. Please select the password and copy it by hand.')
    }
  }

  const expires = new Date(issued.expiresAt).toLocaleString()

  return (
    <section className="credentials" ref={panelRef} tabIndex={-1} aria-labelledby="credentials-heading">
      <h2 id="credentials-heading">Temporary credentials for {issued.name}</h2>
      <p>
        Hand these over privately. They are shown only once and cannot be viewed again. The password
        expires on {expires}, and {issued.name} must choose a new password at first sign in.
      </p>
      <dl className="cred-list">
        <div>
          <dt>Username</dt>
          <dd>
            <code>{issued.username}</code>
          </dd>
        </div>
        <div>
          <dt>Temporary password</dt>
          <dd>
            <code>{issued.temporaryPassword}</code>
          </dd>
        </div>
      </dl>
      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={copyPassword}>
          Copy password
        </button>
        <button type="button" className="btn btn-primary" onClick={onDismiss}>
          I have saved these, hide them
        </button>
      </div>
      <p className="small" role="status">
        {copyMessage}
      </p>
    </section>
  )
}

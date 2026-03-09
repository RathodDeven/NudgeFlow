import { type FormEvent, useState } from 'react'

interface LoginProps {
  onLogin: (token: string) => Promise<void>
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [authError, setAuthError] = useState<string>('')

  const handleLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAuthError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        setAuthError('Invalid admin credentials.')
        return
      }

      const payload = (await response.json()) as { token: string }
      await onLogin(payload.token)
    } catch {
      setAuthError('Network error during login.')
    }
  }

  return (
    <div className="screen center">
      <form className="card login" onSubmit={handleLogin}>
        <h1>Admin Login</h1>
        <p className="muted">Authenticate to load dashboard content.</p>
        <label>
          Username
          <input value={username} onChange={event => setUsername(event.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
        </label>
        {authError ? <p className="error">{authError}</p> : null}
        <button type="submit">Sign In</button>
      </form>
    </div>
  )
}

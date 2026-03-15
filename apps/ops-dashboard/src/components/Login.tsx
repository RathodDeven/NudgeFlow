import { type FormEvent, useState } from 'react'
import { Lock, User, Loader2 } from 'lucide-react'

interface LoginProps {
  onLogin: (token: string) => Promise<void>
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [authError, setAuthError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAuthError('')
    setIsSubmitting(true)

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
        setIsSubmitting(false)
        return
      }

      const payload = (await response.json()) as { token: string }
      await onLogin(payload.token)
    } catch {
      setAuthError('Network error during login.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-100 p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="p-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sign In</h1>
            <p className="text-muted-foreground mt-2">Enter your admin credentials</p>
          </div>

          <form className="p-8 pt-0 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2" htmlFor="username">
                <User className="w-4 h-4 text-muted-foreground" />
                Username
              </label>
              <input
                id="username"
                className="flex h-12 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="admin"
                value={username}
                onChange={event => setUsername(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2" htmlFor="password">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Password
              </label>
              <input
                id="password"
                type="password"
                className="flex h-12 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-in slide-in-from-top-1">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center h-12 px-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to NudgeFlow'
              )}
            </button>
          </form>

          <div className="p-6 bg-muted/30 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Protected area. Admin authorization required for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

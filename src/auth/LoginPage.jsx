import { useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useAuth } from './AuthContext.jsx'

export function LoginPage({ onGoSignup }) {
  const { signIn, configError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await signIn(email.trim(), password)
    setBusy(false)
    if (err) setError(err.message)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="text-center">
          <ListTodo className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h1 className="text-lg font-extrabold text-slate-900">Log in</h1>
          <p className="text-xs text-slate-500 mt-1">Task & Habit Workspace</p>
        </div>

        {configError ? (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3">
            {configError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {error ? (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || Boolean(configError)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500">
          No account?{' '}
          <button
            type="button"
            onClick={onGoSignup}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}

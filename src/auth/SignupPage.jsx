import { useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useAuth } from './AuthContext.jsx'

export function SignupPage({ onGoLogin }) {
  const { signUp, configError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    const { data, error: err } = await signUp(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    // Confirm-email still on → no session yet
    if (!data?.session) {
      setInfo(
        'Account created. If email confirmation is enabled in Supabase, check your inbox, then log in. For auto-login, turn Confirm email OFF in Authentication → Providers → Email.',
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="text-center">
          <ListTodo className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h1 className="text-lg font-extrabold text-slate-900">Sign up</h1>
          <p className="text-xs text-slate-500 mt-1">Create your workspace account</p>
        </div>

        {configError ? (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3">
            {configError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="signup-confirm">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {error ? (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || Boolean(configError)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onGoLogin}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}

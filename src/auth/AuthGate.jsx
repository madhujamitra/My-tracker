import { useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useAuth } from './AuthContext.jsx'
import { LoginPage } from './LoginPage.jsx'
import { SignupPage } from './SignupPage.jsx'

/** Shows login/signup until a session exists; then renders children (dashboard). */
export function AuthGate({ children }) {
  const { session, loading, configError } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-sm">
          <ListTodo className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800 mb-1">Loading…</h2>
          <p className="text-xs text-slate-500">Checking your session.</p>
        </div>
      </div>
    )
  }

  if (!session) {
    if (configError && mode === 'login') {
      // Still show login form which surfaces configError
    }
    return mode === 'signup' ? (
      <SignupPage onGoLogin={() => setMode('login')} />
    ) : (
      <LoginPage onGoSignup={() => setMode('signup')} />
    )
  }

  return children
}

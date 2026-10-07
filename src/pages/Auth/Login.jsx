import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, AlertCircle, UserCheck, Shield, Users, CheckCircle2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuthContext } from '../../contexts/AuthContext';
import { useInstitute } from '../../contexts/InstituteContext';
import { API_BASE_URL } from '../../lib/apiClient';

function Login() {
  // Arriving from institute onboarding (?registered=1) lands the user on the
  // Admin tab with a confirmation, so they can sign in immediately.
  const [searchParams] = useSearchParams();
  const hasRegistered = searchParams.get('registered') === '1';

  const [authMode, setAuthMode] = useState('admin');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, login } = useAuthContext();
  const { role, loading: instituteLoading } = useInstitute();

  // Deterministic preflight (Phase 17): verify the API backend is reachable
  // BEFORE the user submits credentials. Never fakes auth — only reports
  // reachability so a dead backend shows an actionable message instead of
  // a generic "Failed to fetch".
  // NOTE: backend exposes health at the ROOT (GET /health in main.py),
  // not under /api/v1, so derive the backend origin from API_BASE_URL by
  // stripping a trailing /api/v1 suffix. Works for local dev
  // (http://127.0.0.1:8000/api/v1 -> http://127.0.0.1:8000/health) and
  // production (https://<backend>.onrender.com/api/v1 -> https://<backend>.onrender.com/health).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const apiRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
        const res = await fetch(`${apiRoot}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!cancelled) setApiAvailable(res.ok);
      } catch {
        if (!cancelled) setApiAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const switchMode = (mode) => {
    setAuthMode(mode);
    setErrorMessage('');
    reset();
  };

  useEffect(() => {
    if (!authLoading && !instituteLoading && isAuthenticated) {
      if (role === 'student') {
        navigate('/student');
      } else if (role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/dashboard');
      }
    }
  }, [authLoading, instituteLoading, isAuthenticated, role, navigate]);

  const onSubmit = async (data) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const identifier = authMode === 'admin' ? data.email : data.identifier;
      const { error } = await login({
        identifier,
        password: data.password,
        roleType: authMode,
      });
      if (error) {
        setErrorMessage(error.message || 'Invalid credentials.');
      }
      // Navigation handled by useEffect watching isAuthenticated + role
    } catch (error) {
      setErrorMessage(error.message || 'Invalid ID or password.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">EduPilot Portal</h1>
          <p className="text-sm text-slate-400">Sign in to your learning dashboard or institute portal</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/60">
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-slate-950/60 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => switchMode('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                authMode === 'admin' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={14} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => switchMode('teacher')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                authMode === 'teacher' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              Teacher
            </button>
            <button
              type="button"
              onClick={() => switchMode('student')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                authMode === 'student' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              Student
            </button>
          </div>

          {hasRegistered && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Your institute has been registered. Sign in with your new Admin email and password.
              </span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {!apiAvailable && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>EduPilot API is unavailable at {API_BASE_URL}. Start the backend (START_EDUPILOT.bat) and refresh.</span>
              </div>
            )}
            {authMode === 'student' && (
              <div>
                <Input
                  label="Student ID"
                  placeholder="e.g. STU-26-0001"
                  autoComplete="username"
                  {...register('identifier', { required: 'Student ID is required' })}
                />
                {errors.identifier && <p className="mt-1 text-xs text-rose-400">{errors.identifier.message}</p>}
              </div>
            )}

            {authMode === 'teacher' && (
              <div>
                <Input
                  label="Teacher ID"
                  placeholder="e.g. TCH-26-0001"
                  autoComplete="username"
                  {...register('identifier', { required: 'Teacher ID is required' })}
                />
                {errors.identifier && <p className="mt-1 text-xs text-rose-400">{errors.identifier.message}</p>}
              </div>
            )}

            {authMode === 'admin' && (
              <div>
                <Input
                  label="Institute Admin Email"
                  type="email"
                  placeholder="admin@institute.com"
                  autoComplete="email"
                  {...register('email', { required: 'Admin email is required' })}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
              </div>
            )}

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" className="w-full py-3 text-sm font-semibold" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : `Sign in as ${authMode === 'student' ? 'Student' : authMode === 'teacher' ? 'Teacher' : 'Admin'}`}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-xs text-slate-400">
            {authMode === 'admin' && (
              <div>
                <Link to="/forgot-password" className="text-slate-500 hover:text-slate-400 hover:underline">
                  Forgot admin password?
                </Link>
              </div>
            )}
            {authMode === 'admin' && (
              <div>
                <Link
                  to="/register-admin"
                  data-testid="register-admin-link"
                  className="font-semibold text-blue-500 hover:text-blue-400 hover:underline"
                >
                  New to EduPilot? Register as Admin
                </Link>
              </div>
            )}
            <div className="text-slate-500">
              {authMode !== 'admin'
                ? 'Student and Faculty accounts are issued directly by your Institute Administrator.'
                : 'Administrative accounts are strictly authorized per institute.'}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          <Link to="/" className="hover:text-slate-400 transition">← Back to Public Website</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;


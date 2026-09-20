import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuthContext } from '../../contexts/AuthContext';
import { useInstitute } from '../../contexts/InstituteContext';

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuthContext();
  const { role, loading: instituteLoading } = useInstitute();

  useEffect(() => {
    if (!authLoading && !instituteLoading && isAuthenticated) {
      if (role === 'student') {
        navigate('/student');
      } else {
        navigate('/dashboard');
      }
    }
  }, [authLoading, instituteLoading, isAuthenticated, role, navigate]);

  const onSubmit = async (data) => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await login(data);
      if (response.error) {
        throw response.error;
      }
    } catch (error) {
      setErrorMessage(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Sign in to EduPilot AI</h1>
          <p className="text-sm text-slate-400">Access your institute management portal or student dashboard</p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/60">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
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
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-xs text-slate-400">
            <div>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
                Create one now
              </Link>
            </div>
            <div>
              <Link to="/forgot-password" className="text-slate-500 hover:text-slate-400 hover:underline">
                Forgot password?
              </Link>
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

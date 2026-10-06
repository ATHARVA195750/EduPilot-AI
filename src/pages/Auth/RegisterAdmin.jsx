import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  School,
  ShieldCheck,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuthContext } from '../../contexts/AuthContext';
import { useInstitute } from '../../contexts/InstituteContext';
import { registerInstitute } from '../../services/publicInstituteService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-()\s]{7,50}$/;

const SECTION_TITLE =
  'text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2';

/**
 * Public onboarding: a brand-new institute and its first Admin account.
 *
 * This is deliberately NOT the owner-only Admin Management screen
 * (/admin-management), which adds a user to an institute that already exists.
 * Everything the browser sends is treated as untrusted: role and institute_id
 * are chosen server-side by the register-institute Edge Function.
 */
function RegisterAdmin() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      instituteName: '',
      instituteEmail: '',
      contactNumber: '',
      instituteAddress: '',
      fullName: '',
      adminEmail: '',
      password: '',
      confirmPassword: '',
    },
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { loading: instituteLoading } = useInstitute();

  // Already signed in? There is nothing to register from inside a session.
  useEffect(() => {
    if (!authLoading && !instituteLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, instituteLoading, isAuthenticated, navigate]);

  // Confirmation must lead to the existing Admin login, so advance there once
  // the success message has had time to be read.
  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => {
      navigate(`/login?registered=1&email=${encodeURIComponent(success.email)}`, { replace: true });
    }, 3500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const onSubmit = async (data) => {
    // Guard against a second submission racing the disabled state.
    if (isSubmitting || success) return;
    setErrorMessage('');
    try {
      setSuccess(await registerInstitute(data));
      reset();
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.');
    }
  };

  const fieldError = (name) =>
    errors[name] ? (
      <p className="mt-1 text-xs text-rose-400">{errors[name].message}</p>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create your institute</h1>
          <p className="text-sm text-slate-400">
            Register a new coaching institute and create its first Admin account.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/60">
          {success ? (
            <div className="space-y-5 text-center" role="status" aria-live="polite">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Registration successful</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-200">{success.email}</span> is now the Admin
                  of your new institute. You can sign in with that email and password.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
                Redirecting you to the Admin login…
              </div>
              <Link to="/login?registered=1" replace>
                <Button className="w-full py-3 text-sm font-semibold">Go to Admin Login</Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-4">
                <p className={SECTION_TITLE}>
                  <School size={14} /> Institute Details
                </p>

                <div>
                  <Input
                    label="Institute Name"
                    placeholder="e.g. Sunrise Coaching Classes"
                    autoComplete="organization"
                    {...register('instituteName', {
                      required: 'Institute name is required',
                      minLength: { value: 2, message: 'Institute name is too short' },
                      maxLength: { value: 255, message: 'Institute name is too long' },
                    })}
                  />
                  {fieldError('instituteName')}
                </div>

                <div>
                  <Input
                    label="Institute Email"
                    type="email"
                    placeholder="institute@example.com"
                    autoComplete="email"
                    {...register('instituteEmail', {
                      required: 'Institute email is required',
                      pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
                      maxLength: { value: 254, message: 'Email is too long' },
                    })}
                  />
                  {fieldError('instituteEmail')}
                </div>

                <div>
                  <Input
                    label="Contact Number"
                    type="tel"
                    placeholder="e.g. 98765 43210"
                    autoComplete="tel"
                    {...register('contactNumber', {
                      required: 'Contact number is required',
                      pattern: { value: PHONE_PATTERN, message: 'Enter a valid contact number' },
                    })}
                  />
                  {fieldError('contactNumber')}
                </div>

                <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <span className="block">Institute Address</span>
                  <textarea
                    rows={3}
                    placeholder="Street, area, city, state"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                    {...register('instituteAddress', {
                      required: 'Institute address is required',
                      minLength: { value: 5, message: 'Address is too short' },
                      maxLength: { value: 1000, message: 'Address is too long' },
                    })}
                  />
                  {fieldError('instituteAddress')}
                </label>
              </div>

              <div className="space-y-4">
                <p className={SECTION_TITLE}>
                  <ShieldCheck size={14} /> First Admin Details
                </p>

                <div>
                  <Input
                    label="Full Name"
                    placeholder="e.g. Rahul Sharma"
                    autoComplete="name"
                    {...register('fullName', {
                      required: 'Full name is required',
                      minLength: { value: 2, message: 'Full name is too short' },
                      maxLength: { value: 160, message: 'Full name is too long' },
                    })}
                  />
                  {fieldError('fullName')}
                </div>

                <div>
                  <Input
                    label="Admin Email"
                    type="email"
                    placeholder="admin@institute.com"
                    autoComplete="email"
                    {...register('adminEmail', {
                      required: 'Admin email is required',
                      pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
                      maxLength: { value: 254, message: 'Email is too long' },
                    })}
                  />
                  {fieldError('adminEmail')}
                </div>

                <div>
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      maxLength: { value: 128, message: 'Password is too long' },
                    })}
                  />
                  {fieldError('password')}
                </div>

                <div>
                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value, formValues) =>
                        value === formValues.password || 'Passwords do not match',
                    })}
                  />
                  {fieldError('confirmPassword')}
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-6 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                className="mt-6 w-full py-3 text-sm font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating your institute…' : 'Register as Admin'}
              </Button>

              <p className="mt-4 text-center text-xs text-slate-500">
                Your institute and first Admin account are created in one step. No subscription or
                payment is required.
              </p>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-2 text-center text-xs text-slate-500">
          <Link to="/login" className="text-slate-400 hover:text-slate-300 hover:underline">
            ← Back to Admin Login
          </Link>
          <Link to="/" className="text-slate-600 hover:text-slate-400 transition">
            ← Back to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterAdmin;


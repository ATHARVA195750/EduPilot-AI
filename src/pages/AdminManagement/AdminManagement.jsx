import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useInstitute } from '../../contexts/InstituteContext';
import { createInstituteAdmin, fetchInstituteAdmins } from '../../services/adminService';

const EMPTY_FORM = { fullName: '', email: '', password: '', confirmPassword: '' };

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
}

export default function AdminManagement() {
  const { institute, instituteId } = useInstitute();
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    setListError('');
    try {
      setAdmins(await fetchInstituteAdmins(instituteId));
    } catch (error) {
      setListError(error.message || 'Unable to load Admin accounts.');
    } finally {
      setLoadingAdmins(false);
    }
  }, [instituteId]);

  useEffect(() => {
    let active = true;
    setLoadingAdmins(true);
    setListError('');
    fetchInstituteAdmins(instituteId)
      .then((rows) => { if (active) setAdmins(rows); })
      .catch((error) => { if (active) setListError(error.message || 'Unable to load Admin accounts.'); })
      .finally(() => { if (active) setLoadingAdmins(false); });
    return () => { active = false; };
  }, [instituteId]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFormError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccess('');

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    if (!fullName) return setFormError('Enter the Admin’s full name.');
    if (!email) return setFormError('Enter an email address.');
    if (form.password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setFormError('Passwords do not match.');
    if (!instituteId) return setFormError('Your account is not linked to an institute.');

    setSaving(true);
    try {
      await createInstituteAdmin({ fullName, email, password: form.password });
      setForm(EMPTY_FORM);
      setSuccess(`Admin account created for ${email}. They can sign in with this email and password.`);
      await loadAdmins();
    } catch (error) {
      setFormError(error.message || 'Unable to create Admin account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage administrator access for {institute?.name || 'your institute'}.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"><UserPlus size={19} /></span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Create Admin</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">The new account will belong to your institute.</p>
            </div>
          </div>

          {formError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{formError}</span></div>}
          {success && <div role="status" aria-live="polite" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-300"><CheckCircle2 size={17} className="mt-0.5 shrink-0" /><span>{success}</span></div>}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full Name
              <input name="fullName" required maxLength={160} autoComplete="name" value={form.fullName} onChange={handleChange} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
              <input name="email" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={handleChange} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
                <input name="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={handleChange} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm Password
                <input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <span className="font-medium">Institute assignment:</span> {institute?.name || (instituteId ? 'Current institute' : 'Loading institute…')}
            </div>
            <Button type="submit" disabled={saving || loadingAdmins} className="w-full sm:w-auto">
              <UserPlus size={16} className="mr-2" />{saving ? 'Creating Admin…' : 'Create Admin'}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"><ShieldCheck size={19} /></span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Existing Admins</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Administrator accounts linked to this institute.</p>
            </div>
          </div>

          {loadingAdmins ? <div className="py-8"><Loader label="Loading Admin accounts…" /></div> : listError ? (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{listError}</span></div>
          ) : admins.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No additional Admin accounts are listed.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {admins.map((admin) => (
                <li key={admin.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{admin.full_name || 'Admin'}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{admin.email || 'No email recorded'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-300">{admin.status || 'Unknown'}</span>
                    <time dateTime={admin.created_at || undefined}>{formatDate(admin.created_at)}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

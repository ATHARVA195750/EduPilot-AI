import { useInstitute } from '../../contexts/InstituteContext';
import { useMyStudentRecord } from '../../hooks/useMyStudentRecord';

export default function StudentProfile() {
  const { user, profile } = useInstitute();
  const { data: student, isLoading } = useMyStudentRecord();

  if (isLoading) return <div className="text-slate-400">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your student account and enrollment information.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">Student Information</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900 dark:text-white">{student?.full_name || profile?.full_name || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Student ID</dt><dd className="font-medium text-slate-900 dark:text-white">{student?.student_id_code || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Batch</dt><dd className="font-medium text-slate-900 dark:text-white">{student?.batch_name || student?.standard || '—'}</dd></div>
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900 dark:text-white">{user?.email || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Role</dt><dd className="font-medium capitalize text-slate-900 dark:text-white">{profile?.role || 'student'}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}

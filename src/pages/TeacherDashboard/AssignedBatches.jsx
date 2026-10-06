import { useMemo, useState } from 'react';
import { Layers, BookOpen, Building2, Users, Eye, DoorOpen, CheckCircle2, XCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { useMyTeacherRecord } from '../../hooks/useMyTeacherRecord';
import { useTeacherAssignments } from '../../hooks/useTeacherAssignments';
import { useStudents } from '../../hooks/useStudents';

/**
 * Teacher-facing "Assigned Batches" page.
 *
 * Reads the SAME public.teacher_assignments rows that the Owner/Admin creates
 * (and that the Timetable validator consumes). Scope is enforced twice:
 *   1. fetchTeacherAssignments() filters by the logged-in teacher's id, and
 *   2. the live teacher_assignments_select RLS policy only returns a teacher
 *      their own rows (and only within their institute).
 * A defensive client-side filter on teacher_id is added on top of both.
 */
export default function AssignedBatches() {
  const { data: teacherRecord, isLoading: loadingTeacher } = useMyTeacherRecord();
  const { assignments, loading: loadingAssignments } = useTeacherAssignments(teacherRecord?.id);
  const { data: students = [] } = useStudents();
  const [viewing, setViewing] = useState(null);

  const isActive = (status) => String(status || 'active').trim().toLowerCase() === 'active';

  // Enrolled student count per batch, derived from whatever students RLS lets
  // this teacher read (their own assigned batches). No cross-batch leak.
  const studentCounts = useMemo(() => {
    const counts = {};
    for (const s of students) {
      if (s?.batch_id) counts[s.batch_id] = (counts[s.batch_id] || 0) + 1;
    }
    return counts;
  }, [students]);

  // Only the logged-in teacher's OWN assignments.
  const myAssignments = useMemo(
    () => assignments.filter((a) => teacherRecord?.id && a.teacher_id === teacherRecord.id),
    [assignments, teacherRecord],
  );

  const loading = loadingTeacher || loadingAssignments;

  if (loading) return <Loader />;

  if (!teacherRecord) {
    return (
      <Card className="p-6 text-sm text-slate-500 dark:text-slate-400">
        Your account is not linked to a faculty record yet, so no batch assignments can be shown.
        Please contact your institute administrator.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <Layers size={20} className="text-indigo-600 dark:text-indigo-400" /> Assigned Batches
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Batches and subjects allocated to you. These are the same assignments that drive your
            timetable, attendance, homework, tests and results.
          </p>
        </div>
        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          {myAssignments.filter((a) => isActive(a.status)).length} active assignment(s)
        </span>
      </div>

      {myAssignments.length === 0 ? (
        <Card>
          <EmptyState
            title="No batches assigned yet"
            description="Your institute owner or admin has not assigned you to a batch and subject. Once they do, it will appear here."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myAssignments.map((a) => {
            const batch = a.batches;
            const active = isActive(a.status);
            const count = batch?.id ? studentCounts[batch.id] : undefined;
            return (
              <Card key={a.id} className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      {a.subjects?.name || 'Subject'} {a.subjects?.code ? `(${a.subjects.code})` : ''}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                    {batch?.name || 'Class Batch'}
                  </h3>

                  <div className="mt-2 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <BookOpen size={13} className="shrink-0 text-slate-400" />
                      <span>Course: <strong className="text-slate-700 dark:text-slate-300">{batch?.courses?.name || 'General Course'}</strong></span>
                    </div>
                    {batch?.branches?.name && (
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="shrink-0 text-slate-400" />
                        <span>Branch: <strong className="text-slate-700 dark:text-slate-300">{batch.branches.name}</strong></span>
                      </div>
                    )}
                    {batch?.room_number && (
                      <div className="flex items-center gap-2">
                        <DoorOpen size={13} className="shrink-0 text-slate-400" />
                        <span>Room: {batch.room_number}</span>
                      </div>
                    )}
                    {typeof count === 'number' && (
                      <div className="flex items-center gap-2">
                        <Users size={13} className="shrink-0 text-slate-400" />
                        <span>{count} enrolled student{count === 1 ? '' : 's'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    Assigned: {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                  <Button variant="secondary" onClick={() => setViewing(a)}>
                    <Eye size={14} className="mr-1" /> View Batch
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={Boolean(viewing)} onClose={() => setViewing(null)} title="Batch Details">
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Batch" value={viewing.batches?.name || 'Class Batch'} />
              <Detail label="Subject" value={viewing.subjects?.name || 'Subject'} />
              <Detail label="Course" value={viewing.batches?.courses?.name || 'General Course'} />
              <Detail label="Branch" value={viewing.batches?.branches?.name || 'Not recorded'} />
              <Detail label="Room" value={viewing.batches?.room_number || 'Not recorded'} />
              <Detail
                label="Enrolled Students"
                value={
                  viewing.batches?.id && typeof studentCounts[viewing.batches.id] === 'number'
                    ? String(studentCounts[viewing.batches.id])
                    : 'Not available'
                }
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[11px] font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{value}</div>
    </div>
  );
}

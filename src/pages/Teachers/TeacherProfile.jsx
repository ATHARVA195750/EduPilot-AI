import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { fetchTeacher } from '../../services/teacherService';
import { useTeacherAssignments } from '../../hooks/useTeacherAssignments';
import { useBatches } from '../../hooks/useBatches';
import { useSubjects } from '../../hooks/useSubjects';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  Award,
  Calendar,
  DollarSign,
  Plus,
  BookOpen,
  Layers,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';

export default function TeacherProfile() {
  const { id } = useParams();
  const { instituteId } = useInstitute();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teacher, isLoading, error } = useQuery({
    queryKey: ['teacher', id, instituteId],
    queryFn: () => fetchTeacher(id, instituteId),
    enabled: Boolean(id),
  });

  const { assignments, loading: assignmentsLoading, addAssignment, changeStatus, removeAssignment } = useTeacherAssignments(id);
  const { batches } = useBatches();
  const { subjects: allSubjects } = useSubjects();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deep link from the Timetable planner ("Assign <faculty>"), which carries the
  // batch/subject the owner had already chosen so the planner context is not
  // lost. Pre-fills the existing assignment modal - it does not create anything.
  const [searchParams] = useSearchParams();
  const prefillBatch = searchParams.get('assignBatch') || '';
  const prefillSubject = searchParams.get('assignSubject') || '';

  useEffect(() => {
    if (!prefillBatch && !prefillSubject) return;
    // Wait until the batch/subject option lists have actually loaded. Applying
    // the prefill earlier set the state before the <select> had matching
    // <option>s, so the control displayed nothing and the submitted ids fell
    // back to whatever option happened to be first.
    const batchReady = !prefillBatch || batches.some((b) => String(b.id) === String(prefillBatch));
    const subjectReady = !prefillSubject || allSubjects.some((s) => String(s.id) === String(prefillSubject));
    if (assignmentsLoading || !batchReady || !subjectReady) return;
    if (prefillBatch) setSelectedBatchId(prefillBatch);
    if (prefillSubject) setSelectedSubjectId(prefillSubject);
    setIsAssignModalOpen(true);
  }, [prefillBatch, prefillSubject, assignmentsLoading, batches, allSubjects]);

  // Find selected batch to filter relevant subjects by course_id
  const selectedBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId);
  }, [batches, selectedBatchId]);

  const availableSubjects = useMemo(() => {
    if (!selectedBatch || !selectedBatch.course_id) return allSubjects;
    return allSubjects.filter((s) => s.course_id === selectedBatch.course_id);
  }, [allSubjects, selectedBatch]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchId || !selectedSubjectId) {
      toast('Please select both a class batch and a subject.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAssignment({
        teacher_id: id,
        batch_id: selectedBatchId,
        subject_id: selectedSubjectId,
        status: 'Active',
      });
      await queryClient.invalidateQueries({ queryKey: ['teacher', id, instituteId] });
      toast('Teacher assigned to batch & subject successfully.');
      setIsAssignModalOpen(false);
      setSelectedBatchId('');
      setSelectedSubjectId('');
    } catch (err) {
      toast(err.message || 'Failed to create teacher assignment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // teacher_assignments.status is stored lowercase ('active'/'inactive'); all UI
  // comparisons must be case-insensitive or an active assignment rendered as if
  // it were inactive and the toggle sent the wrong (rejected) value.
  const isAssignmentActive = (status) => String(status || 'active').trim().toLowerCase() === 'active';

  const handleToggleAssignmentStatus = async (assignmentId, currentStatus) => {
    const newStatus = isAssignmentActive(currentStatus) ? 'inactive' : 'active';
    try {
      await changeStatus(assignmentId, newStatus);
      await queryClient.invalidateQueries({ queryKey: ['teacher', id, instituteId] });
      toast(`Assignment updated to ${newStatus}.`);
    } catch (err) {
      toast(err.message || 'Failed to update assignment status.', 'error');
    }
  };

  const handleRemoveAssignment = async (assignment) => {
    const label = `${assignment.subjects?.name || 'Subject'} for ${assignment.batches?.name || 'batch'}`;
    if (!window.confirm(`Remove the assignment "${label}"? This cannot be undone.`)) {
      return;
    }
    try {
      await removeAssignment(assignment.id);
      await queryClient.invalidateQueries({ queryKey: ['teacher', id, instituteId] });
      toast('Assignment removed successfully.');
    } catch (err) {
      toast(err.message || 'Failed to remove the assignment.', 'error');
    }
  };

  if (isLoading) return <Loader label="Loading faculty profile details..." />;
  if (error || !teacher) {
    return <Card className="p-6 text-rose-500">Failed to load faculty record.</Card>;
  }

  return (
    <div className="space-y-6">
      <Link to="/teachers" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
        <ArrowLeft size={14} className="mr-1" /> Back to Faculty Staff Directory
      </Link>

      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-md">
              {teacher.full_name?.charAt(0) || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{teacher.full_name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    teacher.status === 'Inactive'
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {teacher.status || 'Active'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Specialization: <strong className="text-slate-800 dark:text-slate-200">{teacher.specialization || 'General Subject'}</strong> • {teacher.qualification || 'Faculty Member'}
              </p>
            </div>
          </div>

          <Button onClick={() => setIsAssignModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Assign Batch & Subject
          </Button>
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Mail size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Email Address</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                {teacher.email || 'No email recorded'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Phone size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Phone Contact</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {teacher.phone || 'No phone recorded'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Joining Date</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {teacher.joining_date || 'N/A'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Base Salary</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {teacher.salary ? `₹${Number(teacher.salary).toLocaleString('en-IN')}` : 'Not recorded'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Teacher Assignments Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={20} className="text-indigo-600" /> Assigned Batches & Subjects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Allocated teaching schedules linked via teacher_assignments architecture.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {assignments.length} total assignment(s)
          </span>
        </div>

        {assignmentsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No active or past batch assignments for {teacher.full_name}. Click "Assign Batch & Subject" above to allocate teaching schedules.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      {a.subjects?.name || 'Subject'} {a.subjects?.code ? `(${a.subjects.code})` : ''}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isAssignmentActive(a.status)
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {isAssignmentActive(a.status) ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                    {a.batches?.name || 'Class Batch'}
                  </h3>

                  <div className="mt-1 text-slate-500 text-[11px]">
                    Course: <strong className="text-slate-700 dark:text-slate-300">{a.batches?.courses?.name || 'General Course'}</strong>
                  </div>

                  {a.batches?.room_number && (
                    <div className="mt-1 text-slate-500 text-[11px]">
                      Room: {a.batches.room_number}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    Created: {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleAssignmentStatus(a.id, a.status)}
                      className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {isAssignmentActive(a.status) ? (
                        <>
                          <ToggleRight size={16} className="text-emerald-500" /> Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={16} className="text-slate-400" /> Reactivate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveAssignment(a)}
                      className="flex items-center gap-1 font-semibold text-rose-500 hover:underline"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Assign Teacher Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign ${teacher.full_name} to Batch & Subject`}>
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Class Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setSelectedSubjectId('');
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- Select Batch --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.course_name || 'Course'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- Select Subject --</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Assignment...' : 'Assign Teacher'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

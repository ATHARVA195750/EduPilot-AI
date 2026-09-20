import { useState } from 'react';
import { useTimetable } from '../../hooks/useTimetable';
import { useBatches } from '../../hooks/useBatches';
import { useTeachers } from '../../hooks/useTeachers';
import { useSubjects } from '../../hooks/useSubjects';
import { useBranches } from '../../hooks/useBranches';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import {
  Calendar,
  Plus,
  Clock,
  AlertTriangle,
  MoreVertical,
  Edit2,
  XCircle,
  Trash2,
  Building,
  BookOpen,
  UserCheck,
  FileText
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_OPTIONS = ['scheduled', 'ongoing', 'completed', 'cancelled'];

const INITIAL_FORM_DATA = {
  id: null,
  branch_id: '',
  branch_name: '',
  batch_id: '',
  batch_name: '',
  subject_id: '',
  subject: '',
  teacher_id: '',
  teacher_name: '',
  room_number: '',
  day_of_week: 'Monday',
  session_date: new Date().toISOString().slice(0, 10),
  start_time: '18:00',
  end_time: '19:30',
  topic: '',
  status: 'scheduled',
  notes: ''
};

export default function Timetable() {
  const { schedules, loading, addSchedule, updateSchedule, cancelSchedule, deleteSchedule } = useTimetable();
  const { batches } = useBatches();
  const { teachers } = useTeachers();
  const { subjects } = useSubjects();
  const { branches } = useBranches();
  const { role } = useInstitute();
  const { toast } = useToast();

  const userRole = String(role || '').toLowerCase();
  const canManage = userRole === 'owner' || userRole === 'admin' || userRole === 'superadmin';

  const [selectedDay, setSelectedDay] = useState('Monday');
  const [showCancelled, setShowCancelled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Confirmation Modals State
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setConflictError(null);

    const firstBatch = batches[0];
    const firstTeacher = teachers[0];
    const firstSubject = subjects[0];
    const firstBranch = branches[0];

    setFormData({
      ...INITIAL_FORM_DATA,
      day_of_week: selectedDay,
      branch_id: firstBranch?.id || '',
      branch_name: firstBranch?.name || 'Main Campus',
      batch_id: firstBatch?.id || '',
      batch_name: firstBatch?.name || 'Class 10th - Batch A',
      subject_id: firstSubject?.id || '',
      subject: firstSubject?.name || 'Physics',
      teacher_id: firstTeacher?.id || '',
      teacher_name: firstTeacher?.full_name || firstTeacher?.name || 'Dr. Rajesh Kumar',
      room_number: firstBatch?.room_number || 'Room 101'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (session) => {
    setOpenMenuId(null);
    setIsEditing(true);
    setConflictError(null);

    setFormData({
      id: session.id,
      branch_id: session.branch_id || '',
      branch_name: session.branch_name || '',
      batch_id: session.batch_id || '',
      batch_name: session.batch_name || '',
      subject_id: session.subject_id || '',
      subject: session.subject || '',
      teacher_id: session.teacher_id || '',
      teacher_name: session.teacher_name || '',
      room_number: session.room_number || 'Room 101',
      day_of_week: session.day_of_week || selectedDay,
      session_date: session.session_date || new Date().toISOString().slice(0, 10),
      start_time: session.start_time || '18:00',
      end_time: session.end_time || '19:30',
      topic: session.topic || '',
      status: session.status || 'scheduled',
      notes: session.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setConflictError(null);
    setIsSubmitting(true);

    try {
      if (isEditing && formData.id) {
        await updateSchedule(formData.id, formData);
        toast('Class session updated successfully.');
      } else {
        await addSchedule(formData);
        toast('Class session scheduled successfully.');
      }
      setIsModalOpen(false);
    } catch (err) {
      setConflictError(err.message || 'Unable to save class session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsSubmitting(true);
    try {
      await cancelSchedule(cancelTarget.id);
      toast(`Class "${cancelTarget.subject} - ${cancelTarget.batch_name}" has been cancelled.`);
      setCancelTarget(null);
    } catch (err) {
      toast(err.message || 'Unable to cancel class session.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await deleteSchedule(deleteTarget.id, deleteTarget.batch_id, deleteTarget.session_date);
      toast(`Class "${deleteTarget.subject} - ${deleteTarget.batch_name}" permanently deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      if (err.message === 'DEPENDENT_RECORDS_EXIST') {
        toast('This class session has attendance or historical records and cannot be deleted. Use "Cancel Class" instead.', 'error');
      } else {
        toast(err.message || 'Unable to delete class session.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading master timetable schedules..." />;

  const filteredSchedules = schedules.filter((s) => {
    const dayMatches = (s.day_of_week || '').toLowerCase() === selectedDay.toLowerCase();
    if (!dayMatches) return false;
    if (!showCancelled && s.status === 'cancelled') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Timetable & Class Scheduling</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Master schedule planner with automated conflict detection and session management.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
            />
            Show Cancelled Classes
          </label>
          {canManage && (
            <Button onClick={handleOpenAddModal}>
              <Plus size={16} className="mr-2" /> Schedule Class Slot
            </Button>
          )}
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => { setSelectedDay(day); setOpenMenuId(null); }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              selectedDay === day
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedules Grid */}
      {filteredSchedules.length === 0 ? (
        <EmptyState
          title={`No Classes Scheduled for ${selectedDay}`}
          description={showCancelled ? "No active or cancelled class sessions for this day." : "Click 'Schedule Class Slot' to add a class session."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map((item) => {
            const isCancelled = item.status === 'cancelled';
            const isOngoing = item.status === 'ongoing';
            const isCompleted = item.status === 'completed';

            return (
              <Card
                key={item.id}
                className={`relative p-5 transition border-l-4 ${
                  isCancelled
                    ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/10 opacity-75'
                    : isOngoing
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : isCompleted
                    ? 'border-slate-400'
                    : 'border-indigo-600 hover:shadow-md'
                }`}
              >
                {/* Header info & menu */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.room_number || 'Room 101'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                          : isOngoing
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : isCompleted
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                      }`}
                    >
                      {item.status || 'scheduled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Clock size={12} /> {item.start_time} - {item.end_time}
                    </span>

                    {/* Action Menu for Admin/Owner */}
                    {canManage && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                          title="Session Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === item.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Edit2 size={14} className="text-indigo-500" /> Edit Class
                              </button>
                              {!isCancelled && (
                                <button
                                  onClick={() => { setOpenMenuId(null); setCancelTarget(item); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                >
                                  <XCircle size={14} className="text-amber-500" /> Cancel Class
                                </button>
                              )}
                              <button
                                onClick={() => { setOpenMenuId(null); setDeleteTarget(item); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 size={14} className="text-rose-500" /> Delete Class
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <h3 className={`mt-3 text-lg font-bold text-slate-900 dark:text-white ${isCancelled ? 'line-through text-slate-500' : ''}`}>
                  {item.batch_name}
                </h3>
                <div className="text-xs font-semibold text-indigo-500">{item.subject}</div>

                {item.topic && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Topic:</span> {item.topic}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300 flex items-center justify-between">
                  <div>
                    <strong>Faculty:</strong> {item.teacher_name || 'Assigned Instructor'}
                  </div>
                  {item.branch_name && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {item.branch_name}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setConflictError(null); }}
        title={isEditing ? "Edit Scheduled Class" : "Schedule Class Slot"}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          {conflictError && (
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <div className="whitespace-pre-line">{conflictError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Branch</label>
              <select
                value={formData.branch_id}
                onChange={(e) => {
                  const b = branches.find(x => String(x.id) === e.target.value);
                  setFormData({ ...formData, branch_id: e.target.value, branch_name: b?.name || '' });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Batch</label>
              <select
                value={formData.batch_id}
                onChange={(e) => {
                  const selectedBatch = batches.find(b => String(b.id) === e.target.value);
                  setFormData({
                    ...formData,
                    batch_id: e.target.value,
                    batch_name: selectedBatch?.name || formData.batch_name
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {(batches.length ? batches : [{ id: 'b1', name: 'Class 10th - Batch A' }, { id: 'b2', name: 'Class 12th - Batch B' }]).map(b => (
                  <option key={b.id || b.name} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Faculty Instructor</label>
              <select
                value={formData.teacher_id}
                onChange={(e) => {
                  const t = teachers.find(x => String(x.id) === e.target.value);
                  setFormData({
                    ...formData,
                    teacher_id: e.target.value,
                    teacher_name: t?.full_name || t?.name || formData.teacher_name
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {(teachers.length ? teachers : [{ id: 't1', name: 'Dr. Rajesh Kumar' }, { id: 't2', name: 'Sunita Gupta' }]).map(t => (
                  <option key={t.id || t.name} value={t.id}>{t.full_name || t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Subject</label>
              <select
                value={formData.subject_id}
                onChange={(e) => {
                  const sub = subjects.find(x => String(x.id) === e.target.value);
                  setFormData({
                    ...formData,
                    subject_id: e.target.value,
                    subject: sub?.name || formData.subject
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {(subjects.length ? subjects : [{ id: 'sub_1', name: 'Physics' }, { id: 'sub_2', name: 'Mathematics' }, { id: 'sub_3', name: 'Chemistry' }]).map(sub => (
                  <option key={sub.id || sub.name} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Day of Week</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <Input
              label="Start Time"
              type="time"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Room / Lab"
              required
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Lesson Topic"
            placeholder="e.g. Newton's Third Law of Motion"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          />

          <Input
            label="Notes / Instructions"
            placeholder="e.g. Bring lab manuals & scientific calculator"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Validating...' : isEditing ? 'Update Session' : 'Validate & Schedule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <Modal
          isOpen={Boolean(cancelTarget)}
          onClose={() => setCancelTarget(null)}
          title="Cancel Class Session"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to cancel the scheduled session for <strong>{cancelTarget.subject} — {cancelTarget.batch_name}</strong>?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The status will be updated to <strong>Cancelled</strong>. The record will remain saved in historical logs.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep Scheduled</Button>
              <Button variant="danger" onClick={handleConfirmCancel} disabled={isSubmitting}>
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete Class Session Permanently"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <div>
                <strong>Warning:</strong> Permanent deletion cannot be undone. Use this only for accidentally created sessions with no student attendance or exam records.
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Delete class session for <strong>{deleteTarget.subject} — {deleteTarget.batch_name}</strong> permanently?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleConfirmDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


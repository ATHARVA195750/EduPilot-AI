import { useState, useMemo } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useMyTeacherRecord } from '../../hooks/useMyTeacherRecord';
import { useBatches } from '../../hooks/useBatches';
import { useTimetable } from '../../hooks/useTimetable';
import { useHomework, useCreateHomework } from '../../hooks/useHomework';
import { useTests } from '../../hooks/useTests';
import { useAnnouncements } from '../../hooks/useMyAnnouncements';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import {
  Calendar,
  Users,
  BookOpen,
  Clock,
  Plus,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export default function TeacherDashboard() {
  const { user } = useAuthContext();
  const { data: teacherRecord, isLoading: loadingTeacher } = useMyTeacherRecord();
  const { batches = [] } = useBatches();
  const { schedules = [], loading: loadingSchedules } = useTimetable();
  const { data: homeworkList = [] } = useHomework();
  const createHomeworkMutation = useCreateHomework();
  const { data: testsList = [] } = useTests();
  const { announcements = [] } = useAnnouncements();
  const { toast } = useToast();

  const teacherName = teacherRecord?.full_name || (user?.email ? user.email.split('@')[0] : 'Faculty Member');
  const teacherId = teacherRecord?.id;

  // Modals state
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const [hwData, setHwData] = useState({
    title: '',
    subject: 'Physics',
    standard: 'Class 10th',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    description: '',
  });

  const [testData, setTestData] = useState({
    title: '',
    subject: 'Physics',
    total_marks: 100,
    passing_marks: 35,
    test_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
  });

  // Filter today's sessions for authenticated teacher
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const todaysClasses = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    if (!teacherId && !teacherRecord?.full_name) return [];

    return schedules
      .filter((s) => {
        // Match teacher ID or teacher full name strictly
        const matchesTeacher =
          (teacherId && String(s.teacher_id).toLowerCase() === String(teacherId).toLowerCase()) ||
          (s.teacher_name && teacherRecord?.full_name && s.teacher_name.toLowerCase() === teacherRecord.full_name.toLowerCase());

        // Match date or day of week
        const sessionDateStr = s.session_date ? String(s.session_date).slice(0, 10) : '';
        const matchesDate =
          sessionDateStr === todayStr ||
          (s.day_of_week && s.day_of_week.toLowerCase() === todayDayName.toLowerCase());

        return matchesTeacher && matchesDate;
      })
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [schedules, teacherId, teacherRecord, todayStr, todayDayName]);

  const handleCreateHw = async (e) => {
    e.preventDefault();
    try {
      await createHomeworkMutation.mutateAsync({
        ...hwData,
        teacher_id: teacherId || null,
      });
      toast('Homework assigned successfully.');
      setIsHomeworkModalOpen(false);
    } catch (err) {
      toast(err.message || 'Unable to create homework.', 'error');
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    toast('Test assessment feature updated.');
    setIsTestModalOpen(false);
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Unlinked Teacher Configuration Warning Banner */}
      {!loadingTeacher && !teacherRecord && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-300">Teacher Profile Unlinked</h4>
            <p className="text-xs text-amber-200/80 mt-1">
              Your logged-in account (<code>{user?.email}</code>) is not mapped to a teacher record in the database (`teachers.user_id`). Please contact your Institute Administrator to map your user ID.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-2">
              <Sparkles size={14} className="text-amber-300" /> Faculty Portal • Live Class Workflows
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome Back, {teacherName}!</h1>
            <p className="mt-1 text-sm text-indigo-100 max-w-xl">
              Real-time classroom attendance, coursework management, and student assessment tools.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setIsHomeworkModalOpen(true)} className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-md">
              <Plus size={16} className="mr-1.5" /> Assign Homework
            </Button>
            <Button onClick={() => setIsTestModalOpen(true)} className="bg-indigo-900/50 hover:bg-indigo-900/80 text-white border border-indigo-400/30">
              <FileText size={16} className="mr-1.5" /> Create Test
            </Button>
          </div>
        </div>
      </div>

      {/* Primary Section: TODAY'S CLASSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="text-indigo-600 dark:text-indigo-400" size={22} />
              Today's Classes ({todayDayName}, {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standing classroom schedule for today's teaching sessions.
            </p>
          </div>
        </div>

        {todaysClasses.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
            <Calendar size={36} className="mx-auto text-slate-400 mb-2" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No Scheduled Classes Today</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              You have no active teaching sessions assigned for {todayDayName}. Check the master timetable for upcoming weekly slots.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todaysClasses.map((session) => (
              <ClassSessionCard
                key={session.id}
                session={session}
              />
            ))}
          </div>
        )}
      </section>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-50 p-3.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned Batches</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{batches.length}</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-purple-50 p-3.5 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Course Homework</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{homeworkList.length}</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Calendar size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Scheduled Assessments</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{testsList.length}</div>
          </div>
        </Card>

      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Assigned Batches */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Users size={18} className="text-indigo-600" /> My Teaching Batches
          </h2>
          <div className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                  <div className="text-xs text-slate-500">{b.course_name} • {b.schedule_days || 'Mon, Wed, Fri'}</div>
                </div>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full">
                  {b.enrolled_count || 30} Students
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Announcements */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Faculty Announcements</h2>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">{ann.title}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{ann.message}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Assign Homework Modal */}
      <Modal isOpen={isHomeworkModalOpen} onClose={() => setIsHomeworkModalOpen(false)} title="Assign New Homework">
        <form onSubmit={handleCreateHw} className="space-y-4">
          <Input label="Homework Title" required placeholder="Calculus Problem Set #4" value={hwData.title} onChange={(e) => setHwData({ ...hwData, title: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Subject" required value={hwData.subject} onChange={(e) => setHwData({ ...hwData, subject: e.target.value })} />
            <Input label="Due Date" type="date" required value={hwData.due_date} onChange={(e) => setHwData({ ...hwData, due_date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description / Instructions</label>
            <textarea
              rows={3}
              value={hwData.description}
              onChange={(e) => setHwData({ ...hwData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsHomeworkModalOpen(false)}>Cancel</Button>
            <Button type="submit">Publish Homework</Button>
          </div>
        </form>
      </Modal>

      {/* Create Test Modal */}
      <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} title="Create Test Assessment">
        <form onSubmit={handleCreateTest} className="space-y-4">
          <Input label="Test Title" required placeholder="Mid-Term Physics Assessment" value={testData.title} onChange={(e) => setTestData({ ...testData, title: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Subject" required value={testData.subject} onChange={(e) => setTestData({ ...testData, subject: e.target.value })} />
            <Input label="Test Date" type="date" required value={testData.test_date} onChange={(e) => setTestData({ ...testData, test_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Total Marks" type="number" required value={testData.total_marks} onChange={(e) => setTestData({ ...testData, total_marks: Number(e.target.value) })} />
            <Input label="Passing Marks" type="number" required value={testData.passing_marks} onChange={(e) => setTestData({ ...testData, passing_marks: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)}>Cancel</Button>
            <Button type="submit">Schedule Test</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/**
 * Single Class Session Card Component for Teacher Dashboard
 */
function ClassSessionCard({ session }) {
  const isCancelled = session.status === 'cancelled';

  return (
    <Card className={`p-5 relative border-l-4 ${isCancelled ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/10' : 'border-indigo-600'}`}>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
          <Clock size={13} /> {session.start_time} - {session.end_time}
        </span>
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium text-slate-700 dark:text-slate-300">
          {session.room_number || 'Room 101'}
        </span>
      </div>

      <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-snug">
        {session.batch_name}
      </h3>
      <div className="text-xs font-semibold text-indigo-500 mt-0.5">{session.subject}</div>

      {session.topic && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-1">
          Topic: {session.topic}
        </p>
      )}

      {session.teacher_name && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
          Faculty: {session.teacher_name}
        </p>
      )}
    </Card>
  );
}

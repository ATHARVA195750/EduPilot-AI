import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import TeacherDashboard from '../pages/TeacherDashboard/TeacherDashboard';
import StudentDashboard from '../pages/StudentDashboard/StudentDashboard';
import Landing from '../pages/Landing/Landing';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import Admissions from '../pages/Admissions/Admissions';
import Students from '../pages/Students/Students';
import AddStudent from '../pages/Students/AddStudent';
import EditStudent from '../pages/Students/EditStudent';
import AdminStudentProfile from '../pages/Students/StudentProfile';
import Teachers from '../pages/Teachers/Teachers';
import TeacherProfile from '../pages/Teachers/TeacherProfile';
import Courses from '../pages/Courses/Courses';
import Branches from '../pages/Branches/Branches';
import Batches from '../pages/Batches/Batches';
import Timetable from '../pages/Timetable/Timetable';
import Attendance from '../pages/Attendance/Attendance';
import Fees from '../pages/Fees/Fees';
import Payments from '../pages/Payments/Payments';
import Finance from '../pages/Finance/Finance';
import Payroll from '../pages/Payroll/Payroll';
import Homework from '../pages/Homework/Homework';
import StudyMaterial from '../pages/StudyMaterial/StudyMaterial';
import Communication from '../pages/Communication/Communication';
import Tests from '../pages/Tests/Tests';
import Results from '../pages/Results/Results';
import Analytics from '../pages/Analytics/Analytics';
import Reports from '../pages/Reports/Reports';
import AI from '../pages/AI/AI';
import Settings from '../pages/Settings/Settings';
import StudentAITutor from '../pages/StudentPortal/StudentAITutor';
import StudentNotifications from '../pages/StudentPortal/StudentNotifications';
import StudentProfile from '../pages/StudentPortal/StudentProfile';
import ProtectedRoute from './ProtectedRoute';
import { useAuthContext } from '../contexts/AuthContext';
import { useInstitute } from '../contexts/InstituteContext';
import { useMyStudentRecord } from '../hooks/useMyStudentRecord';
import { useMyAttendance } from '../hooks/useMyAttendance';
import { useMyHomework } from '../hooks/useMyHomework';
import { useMyStudyMaterial } from '../hooks/useMyStudyMaterial';
import { useMyResults } from '../hooks/useMyResults';
import { useMyAnnouncements } from '../hooks/useMyAnnouncements';
import { useMyFees } from '../hooks/useMyFees';
import { useMyTimetable } from '../hooks/useTimetable';
import { useMyTests } from '../hooks/useTests';

function StudentModuleGate({ studentComponent: StudentComponent, staffComponent: StaffComponent }) {
  const { role } = useInstitute();
  if (role === 'student') return <StudentComponent />;
  return <StaffComponent />;
}

function StudentTimetable() {
  const { data: studentRecord } = useMyStudentRecord();
  const { data: schedules = [], isLoading: loading } = useMyTimetable();

  const items = schedules.filter((s) => s.batch_id && studentRecord?.batch_id ? String(s.batch_id) === String(studentRecord.batch_id) : true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Timetable</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your class schedule for the current term.</p>
      </div>
      {loading ? <div className="text-slate-400">Loading timetable...</div> : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No classes scheduled.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-400">{item.day_of_week}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.status}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{item.subject || 'Class'}</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p><strong>Teacher:</strong> {item.teacher_name || 'Assigned faculty'}</p>
                <p><strong>Date:</strong> {item.session_date ? new Date(item.session_date).toLocaleDateString('en-IN') : '—'}</p>
                <p><strong>Time:</strong> {item.start_time} - {item.end_time}</p>
                <p><strong>Room:</strong> {item.room_number || 'TBA'}</p>
                {item.topic && <p><strong>Topic:</strong> {item.topic}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentAttendance() {
  const { data: attendance = [], isLoading } = useMyAttendance();
  const total = attendance.length;
  const present = attendance.filter((a) => ['present', 'late'].includes(String(a.status || '').toLowerCase())).length;
  const absent = attendance.filter((a) => String(a.status || '').toLowerCase() === 'absent').length;
  const late = attendance.filter((a) => String(a.status || '').toLowerCase() === 'late').length;
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your attendance summary and recent records.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-4 text-white"><div className="text-sm text-slate-300">Overall</div><div className="mt-2 text-3xl font-bold">{pct}%</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-sm text-slate-500">Total Classes</div><div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{total}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-sm text-slate-500">Present</div><div className="mt-2 text-3xl font-bold text-emerald-500">{present}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-sm text-slate-500">Absent</div><div className="mt-2 text-3xl font-bold text-rose-500">{absent}</div></div>
      </div>
      {isLoading ? <div className="text-slate-400">Loading attendance...</div> : attendance.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No attendance records yet.</div>
      ) : (
        <div className="space-y-3">
          {attendance.slice(0, 20).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{item.attendance_date ? new Date(item.attendance_date).toLocaleDateString('en-IN') : 'Attendance record'}</div>
                {item.remarks && <div className="text-xs text-slate-500 dark:text-slate-400">{item.remarks}</div>}
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">{String(item.status || 'unknown')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentHomeworkView() {
  const { data: homework = [], isLoading } = useMyHomework();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Homework</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Assignments relevant to your class and batch.</p>
      </div>
      {isLoading ? <div className="text-slate-400">Loading homework...</div> : homework.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No homework assigned yet.</div>
      ) : (
        <div className="space-y-3">
          {homework.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  {item.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>}
                </div>
                <span className="text-xs font-medium text-amber-500">Due {item.due_date ? new Date(item.due_date).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentStudyMaterialView() {
  const { data: studyMaterials = [], isLoading } = useMyStudyMaterial();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Study Material</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Published resources for your class and batch.</p>
      </div>
      {isLoading ? <div className="text-slate-400">Loading study material...</div> : studyMaterials.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No study materials available yet.</div>
      ) : (
        <div className="space-y-3">
          {studyMaterials.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.subject || item.chapter || 'Study resource'}</div>
              </div>
              {(item.file_url || item.external_url) && (
                <a href={item.external_url || item.file_url} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Open</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentTestsView() {
  const { data: tests = [], isLoading } = useMyTests();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = tests.filter((test) => !test.test_date || new Date(test.test_date) >= today);
  const past = tests.filter((test) => test.test_date && new Date(test.test_date) < today);

  const TestCard = ({ test, isPast = false }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{test.test_name || test.title || 'Assessment'}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{test.subject || test.subjects?.name || 'Subject'}</p>
        </div>
        <span className="text-xs font-medium text-slate-500">{test.test_date ? new Date(test.test_date).toLocaleDateString('en-IN') : 'Date pending'}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Duration: {test.duration_minutes ? `${test.duration_minutes} min` : '—'}</span>
        <span>Total marks: {test.total_marks ?? '—'}</span>
        {test.passing_marks != null && <span>Passing marks: {test.passing_marks}</span>}
        {isPast && <span>Status: {test.status || 'Completed'}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming and published assessments for your batch.</p>
      </div>
      {isLoading ? <div className="text-slate-400">Loading tests...</div> : tests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No tests scheduled yet.</div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Tests</h2>{upcoming.map((test) => <TestCard key={test.id} test={test} />)}</section>}
          {past.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Past Tests</h2>{past.map((test) => <TestCard key={test.id} test={test} isPast />)}</section>}
        </div>
      )}
    </div>
  );
}

function StudentResultsView() {
  const { data: results = [], isLoading } = useMyResults();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Results</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your academic assessment history.</p>
      </div>
      {isLoading ? <div className="text-slate-400">Loading results...</div> : results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No results available yet.</div>
      ) : (
        <div className="space-y-3">
          {results.map((item) => (
            <div key={item.id || item.created_at} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{item.tests?.title || item.tests?.test_name || item.test_name || 'Assessment'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.subject || item.tests?.subject || 'Subject'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600">{item.marks ?? 0}/{item.total_marks ?? 100}</div>
                  <div className="text-xs text-slate-500">{item.percentage ?? 0}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentAnnouncementsView() {
  const { data: announcements = [], isLoading } = useMyAnnouncements();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Announcements</h1>
      </div>
      {isLoading ? <div className="text-slate-400">Loading announcements...</div> : announcements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No announcements available yet.</div>
      ) : (
        <div className="space-y-3">{announcements.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
            <div className="mt-2 text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : 'Recently'}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function StudentFeesView() {
  const { data: fees = [], isLoading } = useMyFees();
  const total = fees.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const paid = fees.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const due = fees.reduce((sum, item) => sum + Number(item.due_amount ?? (Number(item.total_amount || 0) - Number(item.paid_amount || 0)), 0), 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fees & Payments</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-sm text-slate-500">Total Fees</div><div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">₹{total.toLocaleString('en-IN')}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-sm text-slate-500">Paid</div><div className="mt-2 text-2xl font-bold text-emerald-500">₹{paid.toLocaleString('en-IN')}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-sm text-slate-500">Due</div><div className="mt-2 text-2xl font-bold text-amber-500">₹{due.toLocaleString('en-IN')}</div></div>
      </div>
      {isLoading ? <div className="text-slate-400">Loading fees...</div> : fees.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No fee records available yet.</div>
      ) : (
        <div className="space-y-3">{fees.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-white">{item.receipt_number || 'Fee record'}</div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.payment_status || 'pending'}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Total: ₹{Number(item.total_amount || 0).toLocaleString('en-IN')} • Paid: ₹{Number(item.paid_amount || 0).toLocaleString('en-IN')} • Due: ₹{Number(item.due_amount ?? (Number(item.total_amount || 0) - Number(item.paid_amount || 0))).toLocaleString('en-IN')}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function StudentRouteFallback() {
  return <Navigate to="/student" replace />;
}

function RootRoute() {
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { role: userRole, loading: instLoading } = useInstitute();

  if (authLoading || instLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-slate-400 font-medium text-sm">Loading EduPilot...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (userRole === 'student') return <Navigate to="/student" replace />;
    if (userRole === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Role-Specific Dashboards */}
      <Route path="/dashboard" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />

      {/* ERP Modules */}
      <Route path="/admissions" element={<ProtectedRoute role="admin"><Admissions /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute role="admin"><Students /></ProtectedRoute>} />
      <Route path="/students/add" element={<ProtectedRoute role="admin"><AddStudent /></ProtectedRoute>} />
      <Route path="/students/edit/:id" element={<ProtectedRoute role="admin"><EditStudent /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute role="admin"><AdminStudentProfile /></ProtectedRoute>} />
      <Route path="/teachers" element={<ProtectedRoute role="admin"><Teachers /></ProtectedRoute>} />
      <Route path="/teachers/:id" element={<ProtectedRoute role="admin"><TeacherProfile /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute role="admin"><Courses /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute role="admin"><Branches /></ProtectedRoute>} />

      {/* Shared Academic & Operational Modules */}
      <Route path="/batches" element={<ProtectedRoute role="admin"><Batches /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute role="any"><StudentModuleGate studentComponent={StudentTimetable} staffComponent={Timetable} /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute role="any"><StudentModuleGate studentComponent={StudentAttendance} staffComponent={Attendance} /></ProtectedRoute>} />
      <Route path="/fees" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'student']}><StudentModuleGate studentComponent={StudentFeesView} staffComponent={Fees} /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute role="admin"><Payments /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute role="admin"><Finance /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute role="admin"><Payroll /></ProtectedRoute>} />

      <Route path="/homework" element={<ProtectedRoute role="any"><StudentModuleGate studentComponent={StudentHomeworkView} staffComponent={Homework} /></ProtectedRoute>} />
      <Route path="/study-material" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'teacher', 'student']}><StudentModuleGate studentComponent={StudentStudyMaterialView} staffComponent={StudyMaterial} /></ProtectedRoute>} />
      <Route path="/communication" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'teacher', 'student']}><StudentModuleGate studentComponent={StudentAnnouncementsView} staffComponent={Communication} /></ProtectedRoute>} />
      <Route path="/tests" element={<ProtectedRoute role="any"><StudentModuleGate studentComponent={StudentTestsView} staffComponent={Tests} /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute role="any"><StudentModuleGate studentComponent={StudentResultsView} staffComponent={Results} /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute role="admin"><Analytics /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute role="student"><StudentNotifications /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute role="any"><StudentModuleGate studentComponent={StudentAITutor} staffComponent={AI} /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;

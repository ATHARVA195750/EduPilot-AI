import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, AlertTriangle, BookOpen, FileText, Speaker, ExternalLink } from 'lucide-react';
import Card from '../../components/common/Card';
import PageTransition from '../../components/common/PageTransition';
import { ChartSkeleton, MetricSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import { useMyStudentRecord } from '../../hooks/useMyStudentRecord';
import { useMyAttendance } from '../../hooks/useMyAttendance';
import { useMyFees } from '../../hooks/useMyFees';
import { useMyHomework } from '../../hooks/useMyHomework';
import { useMyStudyMaterial } from '../../hooks/useMyStudyMaterial';
import { useMyResults } from '../../hooks/useMyResults';
import { useMyAnnouncements } from '../../hooks/useMyAnnouncements';
import Button from '../../components/common/Button';
import { generateStudentReportCard } from '../../utils/generateReportCard';
import { ONLINE_PAYMENT_VERIFIED, openRazorpayPayment } from '../../utils/razorpay';

const currency = (value) => value == null ? '—' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function StudyMaterialsList({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon={BookOpen} title="No study materials published" description="Study materials from your teachers will appear here." />;
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <motion.div key={idx} variants={itemVariants} className="rounded-lg bg-slate-900/50 border border-slate-700 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-400">{item.material_type || 'Resource'}</span>
            <p className="text-sm font-semibold text-white mt-0.5">{item.title}</p>
            <p className="text-xs text-slate-400 mt-1">{item.chapter || item.subject}</p>
          </div>
          {(item.file_url || item.external_url) && (
            <a
              href={item.external_url || item.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
            >
              <ExternalLink size={14} className="mr-1" /> View
            </a>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <motion.div variants={itemVariants}>
      <Card interactive>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
            {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
          </div>
          <span className={`rounded-xl ${colors[color]} p-3`}>
            <Icon size={20} />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

function AttendanceList({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon={CalendarDays} title="No attendance recorded" description="Your attendance will appear here." />;
  }

  const sortedData = [...data].sort((a, b) => new Date(b.attendance_date) - new Date(a.attendance_date)).slice(0, 30);
  const statusColors = {
    present: 'bg-green-500/10 text-green-400 border-green-500/20',
    absent: 'bg-red-500/10 text-red-400 border-red-500/20',
    late: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    leave: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  const statusLabels = { present: '✓ Present', absent: '✗ Absent', late: '⏱ Late', leave: '📝 Leave' };

  return (
    <div className="space-y-2">
      {sortedData.map((record, idx) => (
        <motion.div key={idx} variants={itemVariants} className={`flex items-center justify-between rounded-lg border ${statusColors[record.status] || 'bg-slate-500/10 text-slate-400'} px-4 py-3`}>
          <div>
            <p className="text-sm font-medium">{new Date(record.attendance_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
          <span className="text-sm font-semibold">{statusLabels[record.status]}</span>
        </motion.div>
      ))}
    </div>
  );
}

function FeesSection({ fees, studentData }) {
  const totalAmount = fees.reduce((sum, f) => sum + (Number(f.total_amount) || 0), 0);
  const paidAmount = fees.reduce((sum, f) => sum + (Number(f.paid_amount) || 0), 0);
  const dueAmount = totalAmount - paidAmount;

  if (!fees || fees.length === 0) {
    return <EmptyState icon={FileText} title="No fees recorded" description="Your fee information will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Amount</p>
            <p className="mt-2 text-2xl font-bold text-white">{currency(totalAmount)}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-400">Paid</p>
            <p className="mt-2 text-2xl font-bold text-green-400">{currency(paidAmount)}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-400">Due</p>
            <p className={`mt-2 text-2xl font-bold ${dueAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>{currency(dueAmount)}</p>
          </div>
        </Card>
      </div>
      <div className="space-y-2">
        {fees.map((fee, idx) => {
          const itemDue = Number(fee.due_amount ?? (Number(fee.total_amount || 0) - Number(fee.paid_amount || 0)));
          const isPending = fee.payment_status === 'pending' || itemDue > 0;

          const handlePayNow = () => {
            // F-28: the button is disabled while ONLINE_PAYMENT_VERIFIED is
            // false, and openRazorpayPayment itself refuses to open. This
            // handler is therefore unreachable until server verification
            // exists; it is kept (rather than deleted) so re-enabling is a
            // one-flag change plus a server-verified onSuccess rewrite.
            openRazorpayPayment({
              amount: itemDue || fee.total_amount || 1000,
              studentName: studentData?.full_name || 'Student',
              feeId: fee.id,
              onSuccess: async () => {
                // F-28: no client-side ledger write. A server-confirmed
                // payment must create the payments row and update the fee.
                window.location.reload();
              },
            });
          };

          return (
            <motion.div key={idx} variants={itemVariants} className="rounded-lg bg-slate-900/50 border border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Payment {idx + 1}</p>
                  {fee.receipt_number && <p className="text-xs text-slate-400">Receipt / Txn: {fee.receipt_number}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{currency(Number(fee.paid_amount) || 0)}</p>
                    <p className={`text-xs ${isPending ? 'text-amber-400 font-semibold' : 'text-green-400'}`}>
                      {isPending ? `Due: ${currency(itemDue)}` : 'Paid'}
                    </p>
                    {isPending && !ONLINE_PAYMENT_VERIFIED && (
                      <p className="text-[11px] text-slate-400">Online payment temporarily disabled — please pay at the institute office.</p>
                    )}
                  </div>
                  {isPending && (
                    <Button
                      onClick={handlePayNow}
                      disabled={!ONLINE_PAYMENT_VERIFIED}
                      title={ONLINE_PAYMENT_VERIFIED ? 'Pay online' : 'Online payment is temporarily disabled until server-side verification is enabled. Please pay at the institute office.'}
                      className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      💳 Pay Now
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function HomeworkList({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon={BookOpen} title="No homework assigned" description="Your homework will appear here." />;
  }

  const sortedData = [...data].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-3">
      {sortedData.map((hw, idx) => {
        const dueDate = new Date(hw.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today;
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        return (
          <motion.div key={idx} variants={itemVariants} className={`rounded-lg border ${isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-700'} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{hw.title}</p>
                {hw.description && <p className="mt-1 text-xs text-slate-400">{hw.description}</p>}
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                  {isOverdue ? '🚨 Overdue' : daysUntilDue === 0 ? '⏰ Due Today' : `Due in ${daysUntilDue} days`}
                </p>
                <p className="mt-1 text-xs text-slate-500">{new Date(hw.due_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ResultsList({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon={CheckCircle2} title="No results yet" description="Your test results will appear here." />;
  }

  const calculateGrade = (pct) => {
    const p = Number(pct);
    if (isNaN(p) || p < 0) return 'N/A';
    if (p >= 90) return 'A+';
    if (p >= 80) return 'A';
    if (p >= 70) return 'B';
    if (p >= 60) return 'C';
    if (p >= 50) return 'D';
    return 'F';
  };

  return (
    <div className="space-y-3">
      {data.map((result, idx) => {
        const title = result.tests?.title || result.tests?.test_name || result.test_name || 'Academic Assessment';
        const subject = result.tests?.subject || result.subject || '';
        const pct = result.percentage ?? Math.round((Number(result.marks) / Number(result.total_marks || 100)) * 100);
        const grade = calculateGrade(pct);

        return (
          <motion.div key={result.id || idx} variants={itemVariants} className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  {subject && (
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                      {subject}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span>Rank: <strong className="text-slate-200">{result.rank ? `#${result.rank}` : '—'}</strong></span>
                  {result.created_at && (
                    <span>Date: {new Date(result.created_at).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-lg font-bold text-indigo-400">{result.marks} <span className="text-xs font-normal text-slate-400">/ {result.total_marks || 100}</span></span>
                  <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                    {grade}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-0.5">{pct}% Score</p>
              </div>
            </div>
            {result.remarks && (
              <p className="mt-2 text-xs italic text-slate-400 border-t border-slate-800/80 pt-2">
                "{result.remarks}"
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function AnnouncementsList({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon={Speaker} title="No announcements" description="Announcements from your institute will appear here." />;
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((announcement, idx) => (
        <motion.div key={idx} variants={itemVariants} className="rounded-lg bg-slate-900/50 border border-slate-700 p-4">
          <p className="text-sm font-semibold text-white">{announcement.title}</p>
          <p className="mt-2 text-sm text-slate-300">{announcement.message}</p>
          <p className="mt-2 text-xs text-slate-500">{new Date(announcement.created_at).toLocaleDateString('en-IN')}</p>
        </motion.div>
      ))}
    </div>
  );
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).split('T')[0];
  const parts = str.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function StudentDashboard() {
  const { data: studentData, isLoading: studentLoading } = useMyStudentRecord();
  const { data: attendance, isLoading: attendanceLoading } = useMyAttendance();
  const { data: fees, isLoading: feesLoading } = useMyFees();
  const { data: homework, isLoading: homeworkLoading } = useMyHomework();
  const { data: results, isLoading: resultsLoading } = useMyResults();
  const { data: studyMaterials, isLoading: studyMaterialLoading } = useMyStudyMaterial();
  const { data: announcements, isLoading: announcementsLoading } = useMyAnnouncements();

  const derived = useMemo(() => {
    if (!attendance || !homework || !fees) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const lastMonthAttendance = attendance.filter((a) => {
      const aDate = parseLocalDate(a.attendance_date);
      if (!aDate) return false;
      return aDate >= thirtyDaysAgo && aDate <= today;
    });

    const presentDays = lastMonthAttendance.filter((a) => ['present', 'late'].includes(String(a.status).toLowerCase())).length;
    let attendancePercent = 0;
    let attendanceDetail = 'No attendance recorded';

    if (lastMonthAttendance.length > 0) {
      attendancePercent = Math.round((presentDays / lastMonthAttendance.length) * 100);
      attendanceDetail = `${presentDays} of ${lastMonthAttendance.length} recorded days present`;
    } else if (attendance.length > 0) {
      const allPresent = attendance.filter((a) => ['present', 'late'].includes(String(a.status).toLowerCase())).length;
      attendancePercent = Math.round((allPresent / attendance.length) * 100);
      attendanceDetail = `${allPresent} of ${attendance.length} total sessions present`;
    }

    const upcomingHomework = homework.filter((h) => {
      const dueDate = parseLocalDate(h.due_date);
      if (!dueDate) return false;
      return dueDate >= today;
    }).length;

    const totalFees = fees.reduce((sum, f) => sum + (Number(f.total_amount) || 0), 0);
    const paidFees = fees.reduce((sum, f) => sum + (Number(f.paid_amount) || 0), 0);
    const pendingFees = totalFees - paidFees;

    // Attendance trend for chart (last 30 days)
    const attendanceTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(date);
      const dayAttendance = attendance.find((a) => {
        const aDate = parseLocalDate(a.attendance_date);
        return aDate && aDate.getTime() === date.getTime();
      });
      const status = dayAttendance?.status?.toLowerCase();
      attendanceTrend.push({
        day: dayStr,
        present: ['present', 'late'].includes(status) ? 1 : 0,
        absent: status === 'absent' ? 1 : 0,
        statusText: dayAttendance ? (status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'late' ? 'Late' : 'Leave') : 'No record'
      });
    }

    return {
      attendancePercent,
      attendanceDetail,
      upcomingHomework,
      pendingFees,
      paidFees,
      totalFees,
      attendanceTrend,
    };
  }, [attendance, homework, fees]);

  const isLoading = studentLoading || attendanceLoading || feesLoading || homeworkLoading || resultsLoading || studyMaterialLoading || announcementsLoading;

  if (isLoading && !derived) {
    return (
      <PageTransition>
        <div className="space-y-6 p-8">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8 p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white">{studentData?.full_name || 'Student'}</h1>
              <p className="mt-2 text-slate-400">
                {studentData?.standard && <span>{studentData.standard}</span>}
                {studentData?.standard && studentData?.batch && <span> • </span>}
                {studentData?.batch && <span>{studentData.batch}</span>}
              </p>
            </div>
            <Button
              onClick={() =>
                generateStudentReportCard({
                  student: studentData,
                  attendance: attendance || [],
                  results: results || [],
                })
              }
            >
              📄 Download Report Card
            </Button>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CheckCircle2} label="Attendance" value={`${derived?.attendancePercent || 0}%`} detail={derived?.attendanceDetail || "Last 30 days"} color="green" />
          <StatCard icon={FileText} label="Fees Due" value={currency(derived?.pendingFees || 0)} detail={`Paid: ${currency(derived?.paidFees || 0)}`} color={derived?.pendingFees > 0 ? 'red' : 'green'} />
          <StatCard icon={BookOpen} label="Pending Homework" value={derived?.upcomingHomework || 0} detail="Assignments due" color="amber" />
          <StatCard icon={AlertCircle} label="Total Fees" value={currency(derived?.totalFees || 0)} detail="Academic year" color="blue" />
        </motion.div>

        {/* Attendance Trend Chart */}
        {derived?.attendanceTrend && (
          <motion.div variants={itemVariants}>
            <Card>
              <div>
                <h2 className="mb-6 text-lg font-semibold text-white">Attendance Trend (30 Days)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={derived.attendanceTrend}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} domain={[0, 1]} ticks={[0, 1]} tickFormatter={(val) => (val === 1 ? 'Yes' : 'No')} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }} formatter={(val, name, item) => [item.payload.statusText, 'Status']} />
                    <Area type="monotone" dataKey="present" stackId="1" stroke="#22c55e" fillOpacity={1} fill="url(#colorPresent)" />
                    <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Two Column Grid */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-2">
          {/* Attendance */}
          <Card>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Recent Attendance</h2>
              <AttendanceList data={attendance} />
            </div>
          </Card>

          {/* Fees */}
          <Card>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Fee Status</h2>
              <FeesSection fees={fees} studentData={studentData} />
            </div>
          </Card>
        </motion.div>

        {/* Homework */}
        <motion.div variants={itemVariants}>
          <Card>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Pending Assignments & Homework</h2>
              <HomeworkList data={homework} />
            </div>
          </Card>
        </motion.div>

        {/* Study Material */}
        <motion.div variants={itemVariants}>
          <Card>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Digital Study Material & Notes</h2>
              <StudyMaterialsList data={studyMaterials} />
            </div>
          </Card>
        </motion.div>


        {/* Results */}
        {results && results.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card>
              <div>
                <h2 className="mb-4 text-lg font-semibold text-white">Test Results</h2>
                <ResultsList data={results} />
              </div>
            </Card>
          </motion.div>
        )}

        {/* Announcements */}
        <motion.div variants={itemVariants}>
          <Card>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Institute Announcements</h2>
              <AnnouncementsList data={announcements} />
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default StudentDashboard;

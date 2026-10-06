import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChartNoAxesColumn, GraduationCap, IndianRupee, Layers, ReceiptText, TrendingUp, UserPlus, Users } from 'lucide-react';
import Card from '../../components/common/Card';
import PageTransition from '../../components/common/PageTransition';
import { ChartSkeleton, MetricSkeleton } from '../../components/common/Skeleton';
import { useInstitute } from '../../contexts/InstituteContext';
import { useDashboard } from '../../hooks/useDashboard';
import { isCollectedPayment, netCashPosition } from '../../utils/finance';

const todayKey = new Date().toISOString().slice(0, 10);
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const currency = (value) => (value == null ? '—' : `₹${number.format(value)}`);
const dateOf = (item) => item.date ?? item.attendance_date ?? item.test_date ?? item.created_at ?? item.payment_date ?? item.due_date ?? item.expense_date;
const amountOf = (fee) => Number(fee.paid_amount ?? fee.amount_paid ?? fee.amount ?? 0);
const dueOf = (fee) => Number(fee.pending_amount ?? fee.balance ?? fee.due_amount ?? 0);

function toMonths(rows, value) {
  const buckets = new Map();
  rows.forEach((row) => {
    const raw = dateOf(row);
    if (!raw || Number.isNaN(new Date(raw).getTime())) return;
    const key = new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(raw));
    buckets.set(key, (buckets.get(key) ?? 0) + value(row));
  });
  return [...buckets.entries()].map(([month, total]) => ({ month, total }));
}

function Metric({ icon: Icon, label, value, detail, href }) {
  const body = (
    <Card interactive className="group h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="rounded-xl bg-blue-500/10 p-3 text-blue-400 transition group-hover:bg-blue-500/20">
          <Icon size={20} />
        </span>
      </div>
    </Card>
  );
  return href ? <Link to={href}>{body}</Link> : body;
}

function Dashboard() {
  const { institute, loading: instituteLoading } = useInstitute();
  const { data, isLoading, error } = useDashboard(institute?.id);

  const derived = useMemo(() => {
    if (!data) return null;
    const todayAttendance = data.attendance.filter((row) => String(row.attendance_date ?? row.date ?? '').slice(0, 10) === todayKey);
    const present = todayAttendance.filter((row) => ['present', 'late'].includes(String(row.status).toLowerCase())).length;
    const attendanceRate = todayAttendance.length ? Math.round((present / todayAttendance.length) * 100) : null;
    const upcomingTests = data.tests.filter((row) => new Date(row.test_date ?? row.date ?? row.scheduled_at) >= new Date()).length;
    const homeworkDue = data.homework.filter((row) => new Date(row.due_date) >= new Date()).length;
    // Canonical net cash position (F-22): collections are ACTUAL successful
    // payments — never the fee ledger's paid_amount — minus expenses and
    // payroll. Shared with financeService, reportService, Analytics and AI.
    const cash = netCashPosition({ payments: data.payments, expenses: data.expenses, payroll: data.payroll });
    const collected = cash.collections;
    const pending = data.fees.reduce((sum, fee) => sum + dueOf(fee), 0);
    const totalExpenses = data.expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const totalPayroll = cash.payroll;
    const netPosition = cash.netCash;

    const attendanceChart = toMonths(data.attendance, (row) => (['present', 'late'].includes(String(row.status).toLowerCase()) ? 1 : 0));
    // F-22: the revenue chart uses the same success-only collections
    // definition as the Collected metric card.
    const revenueChart = toMonths((data.payments || []).filter(isCollectedPayment), (row) => Number(row.amount || 0));

    const activity = [
      ...data.students.map((item) => ({ type: 'Student record', label: item.name ?? item.full_name ?? 'Student', at: dateOf(item) })),
      ...data.fees.map((item) => ({ type: 'Fee payment', label: currency(amountOf(item)), at: dateOf(item) })),
      ...data.homework.map((item) => ({ type: 'Homework', label: item.title ?? item.subject ?? 'Assignment', at: dateOf(item) })),
      ...data.expenses.map((item) => ({ type: 'Expense', label: `${item.category || 'Expense'}: ${currency(Number(item.amount || 0))}`, at: dateOf(item) })),
      ...data.enquiries.map((item) => ({ type: 'Enquiry', label: item.student_name || item.name || 'Lead', at: dateOf(item) })),
    ]
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 5);

    return {
      attendanceRate,
      upcomingTests,
      homeworkDue,
      collected,
      pending,
      totalExpenses,
      totalPayroll,
      netPosition,
      attendanceChart,
      revenueChart,
      activity,
    };
  }, [data]);

  if (instituteLoading || isLoading) {
    return (
      <PageTransition>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (!institute) {
    return (
      <PageTransition>
        <Card>
          <div className="py-12 text-center">
            <h2 className="text-xl font-semibold">Institute not found</h2>
            <p className="mt-2 text-slate-400">Please complete onboarding.</p>
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Card className="border-rose-500/30">
          <div className="flex gap-3 text-rose-100">
            <AlertCircle className="shrink-0" />
            <div>
              <h2 className="font-semibold">Dashboard data could not be loaded</h2>
              <p className="mt-1 text-sm text-rose-200/80">{error.message}</p>
            </div>
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (!data || !derived) return null;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-blue-400">{institute.name}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Command center</h1>
            <p className="mt-1 text-sm text-slate-400">Live institute activity and operational health.</p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300" to="/students/add">
            Add student <ArrowRight size={16} />
          </Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={GraduationCap} label="Total students" value={number.format(data.students.length)} detail="Live student roster" href="/students" />
          <Metric icon={Users} label="Total teachers" value={number.format(data.teachers.length)} detail="Active teaching staff" href="/teachers" />
          <Metric icon={Layers} label="Batches" value={number.format(data.batches.length)} detail="Configured batches" href="/batches" />
          <Metric icon={IndianRupee} label="Fees collected" value={currency(derived.collected)} detail="All recorded payments" href="/fees" />
          <Metric icon={ReceiptText} label="Pending fees" value={currency(derived.pending)} detail="Outstanding recorded balances" href="/fees" />
          <Metric icon={TrendingUp} label="Total expenses" value={currency(derived.totalExpenses)} detail="Operational expenses" href="/finance" />
          <Metric icon={CheckCircle2} label="Today's attendance" value={derived.attendanceRate == null ? '—' : `${derived.attendanceRate}%`} detail={derived.attendanceRate == null ? 'No records today' : 'Present and late marked present'} href="/attendance" />
          <Metric icon={CalendarDays} label="Upcoming tests" value={number.format(derived.upcomingTests)} detail="Scheduled from today" href="/tests" />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-white">Revenue</h2>
            <p className="mt-1 text-sm text-slate-400">Payments grouped by recorded month</p>
            <div className="mt-5 h-72">
              {derived.revenueChart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={derived.revenueChart}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity=".45" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    <Tooltip formatter={(v) => currency(v)} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                    <Area type="monotone" dataKey="total" stroke="#60a5fa" strokeWidth={3} fill="url(#revenue)" animationDuration={650} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No recorded fee payments yet." />
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-white">Attendance trend</h2>
            <p className="mt-1 text-sm text-slate-400">Present and late marks by month</p>
            <div className="mt-5 h-72">
              {derived.attendanceChart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={derived.attendanceChart}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                    <Bar dataKey="total" fill="#34d399" radius={[6, 6, 0, 0]} animationDuration={650} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No attendance records yet." />
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent announcements</h2>
              <Link to="/communication" className="text-xs font-semibold text-blue-400 hover:underline">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-slate-800">
              {data.announcements.length ? (
                data.announcements.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-3 first:pt-0">
                    <p className="font-medium text-slate-100">{item.title ?? item.subject}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.content ?? item.message ?? ''}</p>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No announcements published.</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent enquiries</h2>
              <Link to="/admissions" className="text-xs font-semibold text-blue-400 hover:underline">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-slate-800">
              {data.enquiries.length ? (
                data.enquiries.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <p className="font-medium text-slate-100">{item.student_name || item.name || 'Lead'}</p>
                      <p className="text-xs text-slate-400">{item.course_name || item.course || item.phone || 'Inquiry'}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-300">
                      {item.status || 'new'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No enquiries recorded.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {derived.activity.length ? (
                derived.activity.map((item, index) => (
                  <div key={`${item.type}-${index}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-200">
                        {item.type}: {item.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{new Date(item.at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No recent activity yet.</p>
              )}
            </div>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
      <ChartNoAxesColumn className="text-slate-600" />
      <p className="mt-3 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default Dashboard;
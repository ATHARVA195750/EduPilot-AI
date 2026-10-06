import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, BarChart3, Building2, CheckCircle2, GraduationCap, IndianRupee, Layers, ReceiptText, TrendingUp, Users } from 'lucide-react';
import Card from '../../components/common/Card';
import PageTransition from '../../components/common/PageTransition';
import { ChartSkeleton, MetricSkeleton } from '../../components/common/Skeleton';
import { useInstitute } from '../../contexts/InstituteContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useResults } from '../../hooks/useResults';
import { dateInFinancePeriod, financePeriodForRange, netCashPosition } from '../../utils/finance';

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatCurrency = (val) => (val == null ? '—' : `₹${numberFormatter.format(val)}`);

const getMonthKey = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(d);
};

function groupMonthly(items, getDateFn, getValueFn) {
  const map = new Map();
  (items || []).forEach((item) => {
    const dStr = getDateFn(item);
    const month = getMonthKey(dStr);
    if (!month) return;
    const val = getValueFn(item);
    map.set(month, (map.get(month) || 0) + val);
  });
  return [...map.entries()].map(([month, total]) => ({ month, total }));
}

function StatCard({ label, value, detail, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
  };

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
          {detail && <p className="mt-1.5 text-xs text-slate-500">{detail}</p>}
        </div>
        {Icon && (
          <span className={`rounded-xl p-3 ${colorMap[color] || colorMap.blue}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </Card>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center py-12">
      <BarChart3 className="mx-auto text-slate-600" size={32} />
      <p className="mt-2 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState('all');
  const { institute, loading: instLoading } = useInstitute();
  const { data: dashData, isLoading: dashLoading, error: dashError } = useDashboard(institute?.id);
  const { data: results = [], isLoading: resultsLoading, error: resultsError } = useResults();

  const isLoading = instLoading || dashLoading || resultsLoading;
  const error = dashError || resultsError;

  const cutoffTimestamp = useMemo(() => {
    if (range === 'all') return 0;
    const days = Number(range) || 30;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [range]);

  // F-22: finance rows (payments/expenses/payroll) use the shared period
  // helpers — Asia/Kolkata calendar days, half-open [start, end), NULL dates
  // excluded — identical to the Owner AI financial context.
  const financePeriod = useMemo(() => financePeriodForRange(range), [range]);

  const filterByRange = (item, dateField = 'created_at') => {
    if (!cutoffTimestamp) return true;
    const raw = item[dateField] || item.attendance_date || item.test_date || item.date || item.payment_date || item.expense_date;
    if (!raw) return true;
    return new Date(raw).getTime() >= cutoffTimestamp;
  };

  const analyticsData = useMemo(() => {
    if (!dashData) return null;

    const students = dashData.students.filter((x) => filterByRange(x, 'created_at'));
    const teachers = dashData.teachers.filter((x) => filterByRange(x, 'created_at'));
    const batches = dashData.batches.filter((x) => filterByRange(x, 'created_at'));
    const fees = dashData.fees.filter((x) => filterByRange(x, 'payment_date'));
    // Canonical net cash position (F-22): collections are actual successful
    // payments from the shared finance utility — never the fee ledger. The
    // period helpers below are the same ones the Owner AI context uses.
    const payments = (dashData.payments || []).filter((x) => dateInFinancePeriod(x.payment_date, financePeriod));
    const expenses = dashData.expenses.filter((x) => dateInFinancePeriod(x.expense_date, financePeriod));
    const payroll = dashData.payroll.filter((x) => dateInFinancePeriod(x.payment_date, financePeriod));
    const attendance = dashData.attendance.filter((x) => filterByRange(x, 'attendance_date'));
    const enquiries = dashData.enquiries.filter((x) => filterByRange(x, 'created_at'));
    const filteredResults = results.filter((x) => filterByRange(x, 'created_at'));

    // Calculated totals (F-22 canonical: NET = collections - expenses - payroll)
    const cashTotals = netCashPosition({ payments, expenses, payroll });
    const totalCollected = cashTotals.collections;
    const totalPending = fees.reduce((sum, f) => sum + Number(f.pending_amount ?? f.balance ?? f.due_amount ?? 0), 0);
    const totalExpenses = cashTotals.expenses;
    const totalPayroll = cashTotals.payroll;
    const netPosition = cashTotals.netCash;

    // Monthly trends
    const admissionsTrend = groupMonthly(students, (x) => x.created_at, () => 1);
    const feeTrend = groupMonthly(payments, (x) => x.payment_date || x.created_at, (x) => Number(x.amount || 0));
    const expenseTrend = groupMonthly(expenses, (x) => x.expense_date || x.created_at, (x) => Number(x.amount || 0));
    const attendanceTrend = groupMonthly(attendance, (x) => x.attendance_date || x.date || x.created_at, (x) => (['present', 'late'].includes(String(x.status || '').toLowerCase()) ? 1 : 0));
    const performanceTrend = groupMonthly(filteredResults, (x) => x.created_at, (x) => Number(x.percentage ?? (Number(x.total_marks) ? (Number(x.marks) / Number(x.total_marks)) * 100 : 0)));

    // Enquiry status distribution
    const enquiryStatusCount = enquiries.reduce((acc, eq) => {
      const st = String(eq.status || 'new').toLowerCase();
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    // Student status distribution
    const studentStatusCount = students.reduce((acc, st) => {
      const status = String(st.status || 'active').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalBatches: batches.length,
      totalCollected,
      totalPending,
      totalExpenses,
      totalPayroll,
      netPosition,
      totalEnquiries: enquiries.length,
      totalResults: filteredResults.length,
      admissionsTrend,
      feeTrend,
      expenseTrend,
      attendanceTrend,
      performanceTrend,
      enquiryStatusCount,
      studentStatusCount,
    };
  }, [dashData, results, cutoffTimestamp, financePeriod]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
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
              <h2 className="font-semibold">Analytics could not be loaded</h2>
              <p className="mt-1 text-sm text-rose-200/80">{error.message || String(error)}</p>
            </div>
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (!analyticsData) return null;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="mt-1 text-sm text-slate-400">
              Live operational trends and financial summaries for {institute?.name || 'your institute'}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Period:</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 1 year</option>
            </select>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={GraduationCap} label="Students" value={numberFormatter.format(analyticsData.totalStudents)} detail="Filtered period" color="blue" />
          <StatCard icon={Users} label="Teachers" value={numberFormatter.format(analyticsData.totalTeachers)} detail="Teaching faculty" color="purple" />
          <StatCard icon={Layers} label="Batches" value={numberFormatter.format(analyticsData.totalBatches)} detail="Active batches" color="green" />
          <StatCard icon={Building2} label="Enquiries" value={numberFormatter.format(analyticsData.totalEnquiries)} detail="Admissions leads" color="amber" />
        </div>

        {/* Financial Position Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={IndianRupee} label="Fees Collected" value={formatCurrency(analyticsData.totalCollected)} detail="Recorded payments" color="green" />
          <StatCard icon={ReceiptText} label="Pending Fees" value={formatCurrency(analyticsData.totalPending)} detail="Outstanding balances" color="amber" />
          <StatCard icon={TrendingUp} label="Total Expenses" value={formatCurrency(analyticsData.totalExpenses)} detail="Operational costs" color="rose" />
          <StatCard
            icon={IndianRupee}
            label="Net Financial Position"
            value={formatCurrency(analyticsData.netPosition)}
            detail="Fees collected less expenses & payroll"
            color={analyticsData.netPosition >= 0 ? 'green' : 'rose'}
          />
        </div>

        {/* Trend Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Admissions Trend */}
          <Card>
            <h2 className="text-lg font-semibold text-white">Student Admissions Trend</h2>
            <p className="mt-1 text-sm text-slate-400">New student registrations grouped by month</p>
            <div className="mt-5 h-64">
              {analyticsData.admissionsTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.admissionsTrend}>
                    <defs>
                      <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity=".4" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                    <Area type="monotone" dataKey="total" stroke="#60a5fa" strokeWidth={3} fill="url(#admGrad)" animationDuration={650} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No student registrations recorded in this period." />
              )}
            </div>
          </Card>

          {/* Revenue vs Expense Trend */}
          <Card>
            <h2 className="text-lg font-semibold text-white">Fee Collections</h2>
            <p className="mt-1 text-sm text-slate-400">Monthly payment totals</p>
            <div className="mt-5 h-64">
              {analyticsData.feeTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.feeTrend}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                    <Bar dataKey="total" fill="#34d399" radius={[6, 6, 0, 0]} animationDuration={650} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No fee payments recorded in this period." />
              )}
            </div>
          </Card>

          {/* Attendance Trend */}
          <Card>
            <h2 className="text-lg font-semibold text-white">Attendance Marking Signal</h2>
            <p className="mt-1 text-sm text-slate-400">Present and late marks grouped by month</p>
            <div className="mt-5 h-64">
              {analyticsData.attendanceTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.attendanceTrend}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                    <Bar dataKey="total" fill="#a78bfa" radius={[6, 6, 0, 0]} animationDuration={650} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No attendance records found for this period." />
              )}
            </div>
          </Card>

          {/* Performance Trend */}
          <Card>
            <h2 className="text-lg font-semibold text-white">Academic Assessment Score Trend</h2>
            <p className="mt-1 text-sm text-slate-400">Average percentage in published test results</p>
            <div className="mt-5 h-64">
              {analyticsData.performanceTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.performanceTrend}>
                    <defs>
                      <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity=".4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} />
                    <Tooltip formatter={(v) => `${Math.round(v)}%`} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                    <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} fill="url(#perfGrad)" animationDuration={650} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No test results entered for this period." />
              )}
            </div>
          </Card>
        </div>

        {/* Distribution Breakdown Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Enquiry Pipeline Distribution */}
          <Card>
            <h2 className="text-lg font-semibold text-white">Enquiry Conversion Pipeline</h2>
            <p className="mt-1 text-sm text-slate-400">Distribution of lead inquiry status</p>
            <div className="mt-4 space-y-3">
              {Object.keys(analyticsData.enquiryStatusCount).length ? (
                Object.entries(analyticsData.enquiryStatusCount).map(([status, count]) => {
                  const pct = Math.round((count / (analyticsData.totalEnquiries || 1)) * 100);
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="capitalize font-medium">{status}</span>
                        <span>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">No enquiries found.</p>
              )}
            </div>
          </Card>

          {/* Student Roster Status Distribution */}
          <Card>
            <h2 className="text-lg font-semibold text-white">Student Roster Status</h2>
            <p className="mt-1 text-sm text-slate-400">Active vs inactive student breakdown</p>
            <div className="mt-4 space-y-3">
              {Object.keys(analyticsData.studentStatusCount).length ? (
                Object.entries(analyticsData.studentStatusCount).map(([status, count]) => {
                  const pct = Math.round((count / (analyticsData.totalStudents || 1)) * 100);
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="capitalize font-medium">{status}</span>
                        <span>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">No student records found.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}


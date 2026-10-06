import { fetchStudents } from './studentService';
import { fetchExpenses } from './financeService';
import { fetchPayments } from './paymentService';
import { fetchFees } from './feeService';
import { fetchAttendance } from './attendanceService';
import { fetchResults } from './resultService';
import { fetchPayroll } from './payrollService';
import { fetchEnquiries } from './admissionService';
import { netCashPosition, sumCollections } from '../utils/finance';

export async function fetchStudentReportCardData(studentId, instituteId) {
  const [students, allAttendance, allResults] = await Promise.all([
    fetchStudents(instituteId),
    fetchAttendance(instituteId).catch(() => []),
    fetchResults().catch(() => []),
  ]);

  const student = students.find((s) => String(s.id) === String(studentId)) || students[0];
  if (!student) return null;

  const attendance = allAttendance.filter((a) => String(a.student_id) === String(student.id));
  const results = allResults.filter((r) => String(r.student_id) === String(student.id));

  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => ['present', 'late'].includes(String(a.status || '').toLowerCase())).length;
  const attendancePercentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  const totalTests = results.length;
  const totalPercentageSum = results.reduce((sum, r) => {
    const marks = Number(r.marks ?? r.marks_obtained ?? 0);
    const total = Number(r.total_marks ?? 100);
    const pct = r.percentage ?? (total > 0 ? (marks / total) * 100 : 0);
    return sum + pct;
  }, 0);
  const averageMarks = totalTests ? Math.round((totalPercentageSum / totalTests) * 10) / 10 : 0;

  return {
    student,
    attendance,
    results,
    attendancePercentage,
    totalTests,
    averageMarks,
  };
}

export async function generateFeeReport(instituteId) {
  if (!instituteId) {
    return { totalCollected: 0, totalPending: 0, totalExpected: 0, paymentsCount: 0, pendingStudentsCount: 0, feeRows: [] };
  }

  const [payments, fees] = await Promise.all([
    fetchPayments(instituteId).catch(() => []),
    fetchFees(instituteId).catch(() => []),
  ]);

  // F-22: collections use the shared success-only definition — pending,
  // failed and refunded payments are not cash collected.
  const totalCollected = sumCollections(payments);
  const totalPending = fees.reduce((sum, f) => sum + Number(f.pending_amount ?? f.balance ?? f.due_amount ?? 0), 0);
  const totalExpected = totalCollected + totalPending;

  const pendingRows = fees
    .filter((f) => Number(f.pending_amount ?? f.balance ?? f.due_amount ?? 0) > 0)
    .map((f) => ({
      Student_ID: f.student_id || '—',
      Student_Name: f.students?.full_name || f.student_name || 'Student',
      Total_Fee: Number(f.total_amount || f.amount || 0),
      Paid_Amount: Number(f.paid_amount || f.amount_paid || 0),
      Pending_Due: Number(f.pending_amount ?? f.balance ?? f.due_amount ?? 0),
      Status: f.payment_status || 'Pending',
    }));

  return {
    totalCollected,
    totalPending,
    totalExpected,
    paymentsCount: payments.length,
    pendingStudentsCount: pendingRows.length,
    feeRows: pendingRows,
  };
}

export async function generateFinancialReport(instituteId) {
  if (!instituteId) {
    return { totalRevenue: 0, directExpenses: 0, payrollExpenses: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: {} };
  }

  const [expenses, payments, payroll] = await Promise.all([
    fetchExpenses(instituteId).catch(() => []),
    fetchPayments(instituteId).catch(() => []),
    fetchPayroll(instituteId).catch(() => []),
  ]);

  // Canonical definition (F-22), shared with financeService, Dashboard,
  // Analytics and the Owner AI context: NET = collections − expenses − payroll.
  // Collections count only successful payments (pending/failed/refunded rows
  // are excluded from cash in hand).
  const cash = netCashPosition({ payments, expenses, payroll });
  const totalExpenses = cash.expenses + cash.payroll;

  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'General';
    acc[cat] = (acc[cat] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  if (cash.payroll > 0) {
    expensesByCategory['Staff Payroll'] = cash.payroll;
  }

  return {
    totalRevenue: cash.collections,
    directExpenses: cash.expenses,
    payrollExpenses: cash.payroll,
    totalExpenses,
    netProfit: cash.netCash,
    expensesByCategory,
  };
}

export async function generateAttendanceReport(instituteId) {
  if (!instituteId) return { totalRecords: 0, presentCount: 0, absentCount: 0, attendancePercentage: 0 };

  const attendance = await fetchAttendance(instituteId).catch(() => []);
  const totalRecords = attendance.length;
  const presentCount = attendance.filter((a) => ['present', 'late'].includes(String(a.status || '').toLowerCase())).length;
  const absentCount = attendance.filter((a) => String(a.status || '').toLowerCase() === 'absent').length;
  const attendancePercentage = totalRecords ? Math.round((presentCount / totalRecords) * 100) : 0;

  return {
    totalRecords,
    presentCount,
    absentCount,
    attendancePercentage,
  };
}

export async function generateAdmissionsReport(instituteId) {
  if (!instituteId) return { totalEnquiries: 0, enrolledCount: 0, conversionRate: 0, statusCounts: {} };

  const enquiries = await fetchEnquiries(instituteId).catch(() => []);
  const totalEnquiries = enquiries.length;
  const statusCounts = enquiries.reduce((acc, e) => {
    const st = String(e.status || 'new').toLowerCase();
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const enrolledCount = (statusCounts['enrolled'] || 0) + (statusCounts['converted'] || 0) + (statusCounts['admitted'] || 0);
  const conversionRate = totalEnquiries ? Math.round((enrolledCount / totalEnquiries) * 100) : 0;

  return {
    totalEnquiries,
    enrolledCount,
    conversionRate,
    statusCounts,
    enquiriesRows: enquiries.map((e) => ({
      Student_Name: e.student_name || e.name || 'Lead',
      Phone: e.phone || '—',
      Course: e.course_name || e.course || '—',
      Status: e.status || 'New',
      Date: e.created_at ? new Date(e.created_at).toLocaleDateString() : '—',
    })),
  };
}

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}


import { fetchStudents } from './studentService';
import { fetchExpenses } from './financeService';
import { fetchPayments } from './paymentService';
import { fetchFees } from './feeService';

export async function generateStudentReportCard(studentId) {
  const students = await fetchStudents();
  const student = students.find(s => s.id === studentId) || students[0];

  return {
    student,
    attendancePercentage: 88,
    totalTests: 5,
    averageMarks: 76.4,
    grade: 'A',
    feesStatus: 'Paid',
    remarks: 'Demonstrates strong conceptual clarity in Physics and Math.'
  };
}

export async function generateFeeReport(instituteId) {
  const payments = await fetchPayments(instituteId);
  const fees = await fetchFees(instituteId);

  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPending = fees.reduce((sum, f) => sum + (Number(f.due_amount) || 0), 0);

  return {
    totalCollected,
    totalPending,
    totalExpected: totalCollected + totalPending,
    paymentsCount: payments.length,
    pendingStudentsCount: fees.filter(f => Number(f.due_amount) > 0).length
  };
}

export async function generateFinancialReport(instituteId) {
  const expenses = await fetchExpenses(instituteId);
  const payments = await fetchPayments(instituteId);

  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    expensesByCategory: expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {})
  };
}

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
        cell = cell.replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
        return cell;
      }).join(separator);
    }).join('\n');

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

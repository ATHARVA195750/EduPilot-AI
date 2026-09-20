import { useState, useMemo } from 'react';
import { usePayments } from '../../hooks/usePayments';
import { useStudents } from '../../hooks/useStudents';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { CreditCard, Printer, Search, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { formatPaymentMethodLabel } from '../../utils/constants';

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export default function Payments() {
  const { payments = [], loading: paymentsLoading, error: paymentsError } = usePayments();
  const { data: students = [], isLoading: studentsLoading } = useStudents();

  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Student Map
  const studentMap = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      map.set(s.id, s);
    });
    return map;
  }, [students]);

  // Aggregated Summary
  const { totalCollections, totalTransactions } = useMemo(() => {
    let total = 0;
    payments.forEach((p) => {
      total += Number(p.amount || 0);
    });
    return {
      totalCollections: total,
      totalTransactions: payments.length,
    };
  }, [payments]);

  // Filtered Payments list
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const student = studentMap.get(p.student_id);
      const studentName = (student?.full_name || p.students?.full_name || p.student_name || '').toLowerCase();
      const receiptNum = (p.receipt_number || '').toLowerCase();
      const refNum = (p.reference_number || '').toLowerCase();
      const q = search.toLowerCase();

      return !q || studentName.includes(q) || receiptNum.includes(q) || refNum.includes(q);
    });
  }, [payments, studentMap, search]);

  if (paymentsLoading || studentsLoading) return <Loader label="Loading financial payment transactions..." />;

  if (paymentsError) {
    return (
      <Card className="p-6 border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-rose-400 shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-rose-200">Error Loading Payments</h3>
            <p className="text-sm mt-0.5">{paymentsError.message}</p>
          </div>
        </div>
      </Card>
    );
  }

  const columns = [
    {
      header: 'Receipt #',
      accessor: (row) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {row.receipt_number || 'REC-2026-001'}
        </span>
      ),
    },
    {
      header: 'Student',
      accessor: (row) => {
        const student = studentMap.get(row.student_id);
        const name = student?.full_name || row.students?.full_name || row.student_name || 'Student ID: ' + row.student_id?.slice(0, 8);
        return (
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block">
              {name}
            </span>
            {student?.student_id_code && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {student.student_id_code}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Amount Paid',
      accessor: (row) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {money(row.amount)}
        </span>
      ),
    },
    {
      header: 'Payment Method',
      accessor: (row) => (
        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {formatPaymentMethodLabel(row.payment_method)}
        </span>
      ),
    },
    {
      header: 'Reference #',
      accessor: (row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.reference_number || '—'}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN') : 'Not set'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button size="xs" variant="outline" onClick={() => setSelectedReceipt(row)}>
          <Printer size={14} className="mr-1" /> View Receipt
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-indigo-500" size={26} />
            Payment Collections & Receipt Register
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit live payment transactions, verify reference numbers, and issue official payment receipts.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Collections Recorded</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {money(totalCollections)}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <CreditCard size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Transaction Records</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalTransactions}</span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-purple-500/15 p-3 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <CheckCircle size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Transaction Success Rate</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">100%</span>
          </div>
        </Card>
      </div>

      {/* Search & Transactions Table */}
      <Card className="p-6">
        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by student name, receipt # or reference #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No Payment Transactions Found" description="Recorded fee payments will appear here." />
        ) : (
          <Table columns={columns} data={filtered} />
        )}
      </Card>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          title="Official Fee Payment Receipt"
        >
          <div
            id="printable-receipt"
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                  EduPilot AI Academy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Coaching Institute ERP • Official Payment Receipt
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {selectedReceipt.receipt_number || 'REC-2026-001'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Date: {selectedReceipt.payment_date ? new Date(selectedReceipt.payment_date).toLocaleDateString('en-IN') : 'Not set'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <strong className="text-slate-500 dark:text-slate-400">Received From Student:</strong>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {studentMap.get(selectedReceipt.student_id)?.full_name || selectedReceipt.student_name || 'Student'}
                </div>
              </div>
              <div>
                <strong className="text-slate-500 dark:text-slate-400">Payment Method:</strong>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatPaymentMethodLabel(selectedReceipt.payment_method)} {selectedReceipt.reference_number ? `(${selectedReceipt.reference_number})` : ''}
                </div>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                    Tuition & Academic Fees Payment Installment
                  </td>
                  <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {money(selectedReceipt.amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
              <div>Collected By: <strong className="text-slate-800 dark:text-slate-200">Institute Admin</strong></div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">STATUS: PAID & VERIFIED</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={16} className="mr-2" /> Print Receipt
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

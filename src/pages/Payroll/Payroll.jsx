import { useState } from 'react';
import { usePayroll } from '../../hooks/usePayroll';
import { useTeachers } from '../../hooks/useTeachers';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { DollarSign, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { PAYMENT_METHODS, PAYROLL_STATUSES, formatPaymentMethodLabel } from '../../utils/constants';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentMonth = new Date().toLocaleString('en', { month: 'long' });
const currentYear = String(new Date().getFullYear());

export default function Payroll() {
  const { payroll, loading, error, addPayrollRecord } = usePayroll();
  const { teachers, isLoading: teachersLoading } = useTeachers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Include active teachers (or any teacher where status is not explicitly Inactive)
  const activeTeachers = (teachers || []).filter((t) => {
    if (!t) return false;
    if (!t.status) return true;
    const s = String(t.status).toLowerCase();
    return s !== 'inactive';
  });

  const getDefaultForm = () => ({
    teacher_id: '',
    month: currentMonth,
    year: currentYear,
    base_salary: '',
    allowances: '0',
    deductions: '0',
    payment_status: 'pending',
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().slice(0, 10),
  });

  const [formData, setFormData] = useState(getDefaultForm());

  const handleOpenModal = () => {
    setValidationError('');
    setFormData(getDefaultForm());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.teacher_id || String(formData.teacher_id).trim() === '') {
      setValidationError('Please select a teacher.');
      return;
    }

    const baseSalary = Number(formData.base_salary || 0);
    if (isNaN(baseSalary) || baseSalary <= 0) {
      setValidationError('Base salary must be a positive number greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTeacher = activeTeachers.find((t) => t.id === formData.teacher_id);
      await addPayrollRecord({
        teacher_id: formData.teacher_id,
        teacher_name: selectedTeacher?.full_name || 'selected teacher',
        month: formData.month,
        year: formData.year,
        base_salary: baseSalary,
        allowances: Number(formData.allowances || 0),
        deductions: Number(formData.deductions || 0),
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date || null,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Payroll submit error:', err);
      setValidationError(err.message || 'Failed to process payroll record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build a teacher lookup for display in the table
  const teacherMap = new Map();
  (teachers || []).forEach((t) => teacherMap.set(t.id, t));

  const columns = [
    {
      header: 'Faculty Member',
      accessor: (row) => {
        const teacher = row.teachers || teacherMap.get(row.teacher_id);
        const name = teacher?.full_name || 'Faculty Member';
        return (
          <div className="font-semibold text-slate-900 dark:text-white">
            {name}
          </div>
        );
      },
    },
    {
      header: 'Period',
      accessor: (row) => (
        <span className="text-xs text-slate-500">
          {row.month} {row.year}
        </span>
      ),
    },
    {
      header: 'Base Salary',
      accessor: (row) => <span>₹{Number(row.base_salary || 0)?.toLocaleString()}</span>,
    },
    {
      header: 'Allowances',
      accessor: (row) => <span className="text-emerald-600">+ ₹{Number(row.allowances || 0)?.toLocaleString()}</span>,
    },
    {
      header: 'Deductions',
      accessor: (row) => {
        const val = Number(row.deductions || 0);
        return val > 0
          ? <span className="text-rose-500">- ₹{val.toLocaleString()}</span>
          : <span className="text-slate-400">₹0</span>;
      },
    },
    {
      header: 'Net Payout',
      accessor: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">
          ₹{Number(row.net_salary || (Number(row.base_salary || 0) + Number(row.allowances || 0) - Number(row.deductions || 0)))?.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => {
        const isPaid = String(row.payment_status || '').toLowerCase() === 'paid';
        const displayStatus = row.payment_status 
          ? (String(row.payment_status).charAt(0).toUpperCase() + String(row.payment_status).slice(1).toLowerCase())
          : 'Pending';
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          }`}>
            {isPaid ? <CheckCircle2 size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
            {displayStatus}
          </span>
        );
      },
    },
  ];

  // Compute the net salary preview for the form
  const previewNet = Math.max(
    0,
    Number(formData.base_salary || 0) + Number(formData.allowances || 0) - Number(formData.deductions || 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Faculty & Staff Payroll</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Compute faculty monthly compensation, allowances, deductions, and payout statuses.</p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus size={16} className="mr-2" /> Process Salary Payout
        </Button>
      </div>

      <Card className="p-6">
        {loading ? (
          <Loader label="Loading faculty payroll disbursements..." />
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load payroll records</p>
              <p className="mt-1 text-sm">{error.message || 'Please refresh and try again.'}</p>
            </div>
          </div>
        ) : payroll.length === 0 ? (
          <EmptyState title="No Payroll Records" description="Disbursed salaries will appear here." />
        ) : (
          <Table>
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/70">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Base Salary</th>
                  <th className="px-4 py-3">Allowances</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Salary</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payroll.map((row) => {
                  const teacher = row.teachers || teacherMap.get(row.teacher_id);
                  const isPaid = String(row.payment_status || '').toLowerCase() === 'paid';
                  const displayStatus = row.payment_status
                    ? `${String(row.payment_status).charAt(0).toUpperCase()}${String(row.payment_status).slice(1).toLowerCase()}`
                    : 'Pending';
                  const netSalary = Number(
                    row.net_salary ?? (Number(row.base_salary || 0) + Number(row.allowances || 0) - Number(row.deductions || 0))
                  );
                  // GET /finance/payroll returns the raw record with `month_year`
                  // ("2026-10"); freshly created records also carry numeric
                  // month/year. Derive both so the Period is never blank.
                  const [periodYearRaw, periodMonthRaw] = String(row.month_year || '-').split('-');
                  const periodMonth = row.month != null && row.month !== '' ? Number(row.month) : Number(periodMonthRaw);
                  const periodYear = row.year != null && row.year !== '' ? Number(row.year) : Number(periodYearRaw);
                  const periodMonthLabel = MONTHS[periodMonth - 1] || (Number.isInteger(periodMonth) ? periodMonth : '—');
                  const periodYearLabel = Number.isInteger(periodYear) ? periodYear : '—';

                  return (
                    <tr key={row.id} className="bg-white dark:bg-slate-900/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{teacher?.full_name || 'Faculty Member'}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{periodMonthLabel}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{periodYearLabel}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">₹{Number(row.base_salary || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">+ ₹{Number(row.allowances || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-rose-600 dark:text-rose-400">- ₹{Number(row.deductions || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">₹{netSalary.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {isPaid ? <CheckCircle2 size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatPaymentMethodLabel(row.payment_method)}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Table>
        )}
      </Card>

      {/* Add Payroll Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Process Salary Disbursement">
        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500 dark:text-rose-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          {/* Faculty Dropdown */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Faculty Member *</label>
            <select
              required
              value={formData.teacher_id}
              onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">
                {teachersLoading
                  ? '— Loading faculty list...'
                  : activeTeachers.length === 0
                  ? '— No active teachers found —'
                  : '— Select Faculty Member —'}
              </option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}{t.specialization ? ` (${t.specialization})` : ''}
                </option>
              ))}
            </select>
            {!teachersLoading && activeTeachers.length === 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle size={13} /> No active teachers found in this institute. Add teachers first.
              </p>
            )}
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Month *</label>
              <select
                required
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              label="Year *"
              type="number"
              required
              min={2020}
              max={2099}
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />
          </div>

          {/* Salary Breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Base Salary (₹) *" type="number" required min={0} value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} />
            <Input label="Allowances (₹)" type="number" min={0} value={formData.allowances} onChange={(e) => setFormData({ ...formData, allowances: e.target.value })} />
            <Input label="Deductions (₹)" type="number" min={0} value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })} />
          </div>

          {/* Net Salary Preview */}
          {formData.base_salary !== '' && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Computed Net Payout:</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  ₹{previewNet.toLocaleString()}
                </span>
              </div>
              <div className="text-right text-slate-500 dark:text-slate-400 text-[11px]">
                Base + Allowances − Deductions
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Status</label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {PAYROLL_STATUSES.map((ps) => (
                  <option key={ps.value} value={ps.value}>{ps.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Date</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !formData.teacher_id || !formData.base_salary}>
              {isSubmitting ? 'Processing...' : 'Disburse Payout'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

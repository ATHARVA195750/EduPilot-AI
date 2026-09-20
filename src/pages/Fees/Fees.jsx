import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useFees } from '../../hooks/useFees';
import { useStudents } from '../../hooks/useStudents';
import { createFee } from '../../services/feeService';
import { recordPayment, fetchPaymentsByFeeId } from '../../services/paymentService';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import { PAYMENT_METHODS, formatPaymentMethodLabel } from '../../utils/constants';
import {
  CreditCard,
  Plus,
  Search,
  DollarSign,
  AlertCircle,
  Calendar,
  History,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

function getWhatsAppFeeUrl(phone, studentName, dueAmount) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  const fullPhone = digits.length === 10 ? `91${digits}` : digits;
  const message = `Dear Parent, this is a friendly reminder from EduPilot Academy that a fee payment of ${money(
    dueAmount
  )} for ${studentName} is pending. Please complete the payment at your earliest convenience. Thank you!`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

export default function Fees() {
  const { institute } = useInstitute();
  const { data: fees = [], isLoading: feesLoading, error: feesError } = useFees();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateFeeOpen, setIsCreateFeeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [historyFeeItem, setHistoryFeeItem] = useState(null);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Form submitting flags
  const [isSubmittingFee, setIsSubmittingFee] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Create Fee Form State
  const [createFeeForm, setCreateFeeForm] = useState({
    student_id: '',
    total_amount: '',
    discount_amount: '0',
    due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    payment_mode: 'cash',
  });

  // Record Payment Form State
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    fee_id: '',
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    reference_number: '',
  });

  // Student Map
  const studentMap = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      map.set(s.id, s);
    });
    return map;
  }, [students]);

  // Aggregated Summary
  const { totalCollected, totalPending, totalFeesCount } = useMemo(() => {
    let collected = 0;
    let pending = 0;
    fees.forEach((f) => {
      collected += Number(f.paid_amount || 0);
      pending += Number(f.due_amount || 0);
    });
    return {
      totalCollected: collected,
      totalPending: pending,
      totalFeesCount: fees.length,
    };
  }, [fees]);

  // Filtered Fees List
  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      const student = studentMap.get(f.student_id);
      const studentName = student?.full_name?.toLowerCase() || '';
      const receiptNum = f.receipt_number?.toLowerCase() || '';
      const q = search.toLowerCase();

      const matchesSearch = !q || studentName.includes(q) || receiptNum.includes(q);
      const matchesStatus = !statusFilter || f.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [fees, studentMap, search, statusFilter]);

  // Handlers
  const handleOpenCreateFee = () => {
    setCreateFeeForm({
      student_id: students[0]?.id || '',
      total_amount: '',
      discount_amount: '0',
      due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      payment_mode: 'cash',
    });
    setIsCreateFeeOpen(true);
  };

  const handleCreateFeeSubmit = async (e) => {
    e.preventDefault();
    if (!createFeeForm.student_id) {
      toast('Please select a student.', 'error');
      return;
    }

    const totalNum = Number(createFeeForm.total_amount);
    const discountNum = Number(createFeeForm.discount_amount || 0);

    if (isNaN(totalNum) || totalNum <= 0) {
      toast('Please enter a valid total fee amount (greater than 0).', 'error');
      return;
    }

    if (isNaN(discountNum) || discountNum < 0) {
      toast('Discount amount cannot be negative.', 'error');
      return;
    }

    if (discountNum > totalNum) {
      toast(`Discount amount (${money(discountNum)}) cannot exceed total fee (${money(totalNum)}).`, 'error');
      return;
    }

    setIsSubmittingFee(true);
    try {
      await createFee(
        {
          student_id: createFeeForm.student_id,
          total_amount: totalNum,
          discount_amount: discountNum,
          due_date: createFeeForm.due_date || null,
          payment_mode: createFeeForm.payment_mode,
        },
        institute?.id
      );

      await queryClient.invalidateQueries({ queryKey: ['fees', institute?.id] });
      toast('Student fee structure created successfully.');
      setIsCreateFeeOpen(false);
    } catch (err) {
      console.error('Create fee error:', err);
      toast(err.message || 'Failed to create fee structure.', 'error');
    } finally {
      setIsSubmittingFee(false);
    }
  };

  const handleOpenRecordPayment = (feeItem = null) => {
    const targetFee = feeItem || fees[0];
    if (!targetFee) {
      toast('No fee structure found to record payment against. Create a fee structure first.', 'error');
      return;
    }

    setSelectedFeeForPayment(targetFee);
    setRecordPaymentForm({
      fee_id: targetFee.id,
      student_id: targetFee.student_id,
      amount: String(targetFee.due_amount || ''),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      reference_number: '',
    });
    setIsRecordPaymentOpen(true);
  };

  const handleFeeSelectionChangeInPayment = (feeId) => {
    const targetFee = fees.find((f) => f.id === feeId);
    if (targetFee) {
      setSelectedFeeForPayment(targetFee);
      setRecordPaymentForm((prev) => ({
        ...prev,
        fee_id: targetFee.id,
        student_id: targetFee.student_id,
        amount: String(targetFee.due_amount || ''),
      }));
    }
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!recordPaymentForm.fee_id || !recordPaymentForm.student_id) {
      toast('Target fee structure and student are required.', 'error');
      return;
    }

    const payAmount = Number(recordPaymentForm.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      toast('Payment amount must be greater than 0.', 'error');
      return;
    }

    // Overpayment check against selected fee
    const currentFee = selectedFeeForPayment || fees.find((f) => f.id === recordPaymentForm.fee_id);
    if (currentFee) {
      const netFee = Number(currentFee.total_amount || 0) - Number(currentFee.discount_amount || 0);
      const currentPaid = Number(currentFee.paid_amount || 0);
      const remainingDue = Math.max(0, netFee - currentPaid);

      if (payAmount > remainingDue) {
        toast(
          `Overpayment Rejected: Payment amount (${money(payAmount)}) exceeds remaining due balance (${money(
            remainingDue
          )}).`,
          'error'
        );
        return;
      }
    }

    setIsSubmittingPayment(true);
    try {
      await recordPayment(
        {
          fee_id: recordPaymentForm.fee_id,
          student_id: recordPaymentForm.student_id,
          amount: payAmount,
          payment_date: recordPaymentForm.payment_date,
          payment_method: recordPaymentForm.payment_method,
          reference_number: recordPaymentForm.reference_number?.trim() || null,
        },
        institute?.id
      );

      await queryClient.invalidateQueries({ queryKey: ['fees', institute?.id] });
      await queryClient.invalidateQueries({ queryKey: ['payments', institute?.id] });

      toast('Fee payment recorded and ledger updated successfully.');
      setIsRecordPaymentOpen(false);
    } catch (err) {
      console.error('Record payment error:', {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
      });
      toast(err?.message || 'Failed to record fee payment.', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleViewHistory = async (feeItem) => {
    setHistoryFeeItem(feeItem);
    setIsHistoryLoading(true);
    try {
      const history = await fetchPaymentsByFeeId(feeItem.id, institute?.id);
      setHistoryPayments(history);
    } catch (err) {
      console.error('Fetch payment history error:', err);
      toast('Unable to fetch payment history.', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  if (feesLoading || studentsLoading) return <Loader label="Loading institute fee ledger records..." />;

  if (feesError) {
    return (
      <Card className="p-6 border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-rose-400 shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-rose-200">Error Loading Fee Records</h3>
            <p className="text-sm mt-0.5">{feesError.message}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-indigo-500" size={26} />
            Fees & Student Payment Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track student fee structures, record installment payments, monitor outstanding dues, and issue receipts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handleOpenCreateFee} className="gap-2">
            <Plus size={16} /> Assign Fee Structure
          </Button>
          <Button onClick={() => handleOpenRecordPayment()} className="gap-2">
            <DollarSign size={16} /> Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total Collections Recorded</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{money(totalCollected)}</span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Outstanding Dues Pending</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{money(totalPending)}</span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <CreditCard size={24} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total Assigned Fee Accounts</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalFeesCount}</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name or receipt number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-52">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                All Payment Statuses
              </option>
              <option value="paid" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Paid (Fully Settled)
              </option>
              <option value="partial" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Partial (Installment)
              </option>
              <option value="pending" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Pending (Unpaid)
              </option>
            </select>
          </div>
        </div>
      </Card>

      {/* Fee Table */}
      {filteredFees.length === 0 ? (
        <EmptyState
          title="No Fee Accounts Found"
          description={
            search || statusFilter
              ? 'No student fee records match your search or filter criteria.'
              : 'Click "Assign Fee Structure" to assign fee accounts to students.'
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4 text-right">Total Fee</th>
                  <th className="py-3.5 px-4 text-right">Discount</th>
                  <th className="py-3.5 px-4 text-right">Net Fee</th>
                  <th className="py-3.5 px-4 text-right">Paid</th>
                  <th className="py-3.5 px-4 text-right">Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                {filteredFees.map((fee) => {
                  const student = studentMap.get(fee.student_id);
                  const studentName = student?.full_name || 'Student ID: ' + fee.student_id.slice(0, 8);
                  const studentCode = student?.student_id_code || student?.standard || '';

                  const total = Number(fee.total_amount || 0);
                  const discount = Number(fee.discount_amount || 0);
                  const netFee = Math.max(0, total - discount);
                  const paid = Number(fee.paid_amount || 0);
                  const due = Number(fee.due_amount || 0);

                  const status = fee.payment_status || (due === 0 ? 'paid' : paid > 0 ? 'partial' : 'pending');
                  const waUrl = due > 0 && student ? getWhatsAppFeeUrl(student.parent_phone, studentName, due) : null;

                  return (
                    <tr
                      key={fee.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {studentName}
                        </span>
                        {studentCode && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {studentCode}
                          </span>
                        )}
                        {fee.receipt_number && (
                          <span className="block text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                            {fee.receipt_number}
                          </span>
                        )}
                      </td>

                      {/* Financial Breakdown */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {money(total)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {discount > 0 ? `-${money(discount)}` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {money(netFee)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {money(paid)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        {money(due)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : status === 'partial'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-600 dark:text-slate-400">
                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : 'Not set'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {due > 0 && (
                            <Button
                              size="xs"
                              className="py-1 px-2.5 text-xs"
                              onClick={() => handleOpenRecordPayment(fee)}
                            >
                              Record Payment
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            className="py-1 px-2.5 text-xs gap-1"
                            onClick={() => handleViewHistory(fee)}
                          >
                            <History size={13} /> History
                          </Button>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/15 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/25 transition"
                              title="Send WhatsApp Fee Due Reminder"
                            >
                              <Send size={12} /> WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assign Fee Structure Modal */}
      <Modal isOpen={isCreateFeeOpen} onClose={() => setIsCreateFeeOpen(false)} title="Assign Student Fee Structure">
        <form onSubmit={handleCreateFeeSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Student *
            </label>
            <select
              required
              value={createFeeForm.student_id}
              onChange={(e) => setCreateFeeForm({ ...createFeeForm, student_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                -- Select Student --
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                  {s.full_name} ({s.standard || s.batch_name || 'Class'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Total Fee Amount (₹) *"
              type="number"
              required
              min={0}
              placeholder="e.g. 10000"
              value={createFeeForm.total_amount}
              onChange={(e) => setCreateFeeForm({ ...createFeeForm, total_amount: e.target.value })}
            />
            <Input
              label="Discount Concession (₹)"
              type="number"
              min={0}
              placeholder="e.g. 1000"
              value={createFeeForm.discount_amount}
              onChange={(e) => setCreateFeeForm({ ...createFeeForm, discount_amount: e.target.value })}
            />
          </div>

          {createFeeForm.total_amount !== '' && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Calculated Net Payable Fee:</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {money(
                    Math.max(
                      0,
                      Number(createFeeForm.total_amount || 0) - Number(createFeeForm.discount_amount || 0)
                    )
                  )}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block">Initial Status:</span>
                <span className="font-bold text-amber-500">PENDING (Unpaid)</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Fee Due Date
              </label>
              <input
                type="date"
                value={createFeeForm.due_date}
                onChange={(e) => setCreateFeeForm({ ...createFeeForm, due_date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Mode
              </label>
              <select
                value={createFeeForm.payment_mode}
                onChange={(e) => setCreateFeeForm({ ...createFeeForm, payment_mode: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="cash" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Cash</option>
                <option value="upi" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">UPI / QR</option>
                <option value="bank_transfer" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Bank Transfer</option>
                <option value="cheque" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Cheque</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateFeeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingFee || !createFeeForm.student_id || !createFeeForm.total_amount}>
              {isSubmittingFee ? 'Saving Fee Account...' : 'Assign Fee Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Fee Payment Modal */}
      <Modal isOpen={isRecordPaymentOpen} onClose={() => setIsRecordPaymentOpen(false)} title="Record Fee Payment Installment">
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Target Student Fee Structure *
            </label>
            <select
              required
              value={recordPaymentForm.fee_id}
              onChange={(e) => handleFeeSelectionChangeInPayment(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                -- Choose Fee Structure --
              </option>
              {fees.map((f) => {
                const s = studentMap.get(f.student_id);
                const name = s?.full_name || 'Student ID: ' + f.student_id.slice(0, 8);
                const due = Number(f.due_amount || 0);
                return (
                  <option
                    key={f.id}
                    value={f.id}
                    className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                  >
                    {name} — Due: {money(due)} ({f.receipt_number || 'No receipt'})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedFeeForPayment && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/60 grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block">Total Net Fee:</span>
                <strong className="text-slate-900 dark:text-white">
                  {money(
                    Number(selectedFeeForPayment.total_amount || 0) -
                      Number(selectedFeeForPayment.discount_amount || 0)
                  )}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Current Paid Amount:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {money(selectedFeeForPayment.paid_amount || 0)}
                </strong>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                <span className="text-slate-400">Remaining Due Balance:</span>
                <strong className="text-rose-600 dark:text-rose-400 text-sm">
                  {money(selectedFeeForPayment.due_amount || 0)}
                </strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Payment Amount (₹) *"
              type="number"
              required
              min={1}
              placeholder="e.g. 5000"
              value={recordPaymentForm.amount}
              onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, amount: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Method *
              </label>
              <select
                required
                value={recordPaymentForm.payment_method}
                onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, payment_method: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={recordPaymentForm.payment_date}
                onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, payment_date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <Input
              label="Reference / Transaction # (Optional)"
              type="text"
              placeholder="e.g. UTR98231049182"
              value={recordPaymentForm.reference_number}
              onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, reference_number: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingPayment || !recordPaymentForm.fee_id || !recordPaymentForm.amount}
            >
              {isSubmittingPayment ? 'Saving Payment...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment History Modal */}
      {historyFeeItem && (
        <Modal
          isOpen={Boolean(historyFeeItem)}
          onClose={() => setHistoryFeeItem(null)}
          title={`Payment History — ${studentMap.get(historyFeeItem.student_id)?.full_name || 'Student'}`}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/60 flex justify-between items-center text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block">Total Net Fee:</span>
                <strong className="text-slate-900 dark:text-white text-sm">
                  {money(
                    Number(historyFeeItem.total_amount || 0) - Number(historyFeeItem.discount_amount || 0)
                  )}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Paid to Date:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                  {money(historyFeeItem.paid_amount || 0)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Current Due:</span>
                <strong className="text-rose-600 dark:text-rose-400 text-sm">
                  {money(historyFeeItem.due_amount || 0)}
                </strong>
              </div>
            </div>

            {isHistoryLoading ? (
              <Loader label="Loading transaction payments..." />
            ) : historyPayments.length === 0 ? (
              <EmptyState
                title="No Payments Recorded Yet"
                description="No transaction payments have been submitted for this fee structure."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-500 font-semibold">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5">Receipt #</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {historyPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                          {money(p.amount)}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">
                          {formatPaymentMethodLabel(p.payment_method)}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                          {p.reference_number || '—'}
                        </td>
                        <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                          {p.receipt_number || '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="inline-flex items-center rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {p.status || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setHistoryFeeItem(null)}>
                Close History
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

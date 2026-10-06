import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Printer, FileDown, XCircle } from 'lucide-react';
import { formatPaymentMethodLabel } from '../../utils/constants';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import { useToast } from './Toast';

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const prettyDate = (d) => {
  if (!d) return '—';
  const parsed = new Date(String(d).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_STYLE = {
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  refunded: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  void: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

const AMOUNT_ROWS = [
  ['Tuition & Academic Fee', 'fee_total', ''],
  ['Previous Due', 'previous_due', ''],
  ['Amount Paid', 'amount_paid', 'font-bold text-emerald-600 dark:text-emerald-400'],
  ['Remaining Due', 'remaining_due', 'text-rose-600 dark:text-rose-400'],
];

/**
 * Printable A4 invoice preview with Download PDF and Print actions.
 *
 * Renders exclusively from the invoice's snapshot columns, so what is shown is
 * exactly what was captured when the payment was recorded.
 */
export default function InvoiceModal({ invoice, isOpen, onClose }) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const status = String(invoice.status || 'paid').toLowerCase();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateInvoicePdf(invoice);
      toast('Invoice PDF downloaded.');
    } catch (err) {
      toast(err?.message || 'Unable to generate the invoice PDF.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Fee Invoice ${invoice.invoice_number || ''}`}>
      <div
        id="printable-invoice"
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      >
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {invoice.institute_name || 'EduPilot Institute'}
            </h2>
            <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              {invoice.institute_address && <div>{invoice.institute_address}</div>}
              <div>
                {[invoice.institute_phone && `Phone: ${invoice.institute_phone}`, invoice.institute_email]
                  .filter(Boolean)
                  .join('   |   ')}
              </div>
              {/* GSTIN renders only when the institute has configured one. */}
              {invoice.institute_gstin && <div>GSTIN: {invoice.institute_gstin}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Fee Invoice
            </div>
            <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
              {invoice.invoice_number || '—'}
            </div>
            <span
              className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                STATUS_STYLE[status] || STATUS_STYLE.paid
              }`}
            >
              {statusLabel.toUpperCase()}
            </span>
          </div>
        </div>


        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Billed To</div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {invoice.student_name || 'Student'}
            </div>
            <div className="mt-0.5 space-y-0.5 text-slate-500 dark:text-slate-400">
              {invoice.student_code && <div>Student ID: {invoice.student_code}</div>}
              {invoice.batch_name && <div>Batch: {invoice.batch_name}</div>}
              {invoice.course_name && <div>Course: {invoice.course_name}</div>}
            </div>
          </div>
          <div className="space-y-1 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Invoice Date</span>
              <span className="font-medium">{prettyDate(invoice.created_at || invoice.payment_date)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Payment Date</span>
              <span className="font-medium">{prettyDate(invoice.payment_date)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Method</span>
              <span className="font-medium">{formatPaymentMethodLabel(invoice.payment_method)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Reference</span>
              <span className="font-mono font-medium">{invoice.reference_number || '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Receipt</span>
              <span className="font-mono font-medium">{invoice.receipt_number || '—'}</span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <th className="p-2.5">Description</th>
              <th className="p-2.5 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {AMOUNT_ROWS.map(([label, key, cls]) => (
              <tr key={key} className="border-b border-slate-100 dark:border-slate-800">
                <td className="p-2.5 text-slate-800 dark:text-slate-200">{label}</td>
                <td className={`p-2.5 text-right ${cls}`}>{money(invoice[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] leading-relaxed text-slate-400">
          This is a computer-generated fee invoice. Amounts are snapshotted at the time of payment and are
          not affected by later changes to student, batch or fee records.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          <XCircle size={16} className="mr-2" /> Close
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} className="mr-2" /> Print Invoice
        </Button>
        <Button onClick={handleDownload} disabled={isDownloading}>
          <FileDown size={16} className="mr-2" />
          {isDownloading ? 'Preparing PDF...' : 'Download PDF'}
        </Button>
      </div>
    </Modal>
  );
}

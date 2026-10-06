import { formatPaymentMethodLabel } from './constants';

const prettyDate = (d) => {
  if (!d) return '—';
  const parsed = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_LABEL = { paid: 'PAID', refunded: 'REFUNDED', void: 'VOID' };

/**
 * Render an invoice as a downloadable A4 PDF.
 *
 * Reuses the project's existing jspdf + jspdf-autotable stack (both already
 * used by generateReportCard.js and already code-split into lazy chunks), so no
 * new dependency is introduced.
 *
 * Every value comes from the invoice's own snapshot columns, never from live
 * student/fee rows, so the document reproduces exactly what was issued.
 */
export async function generateInvoicePdf(invoice) {
  if (!invoice) throw new Error('An invoice is required to generate a PDF.');

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // A4 portrait, millimetres.
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ---------- Header band ----------
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(invoice.institute_name || 'EduPilot Institute', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const headerLines = [
    invoice.institute_address,
    [invoice.institute_phone && `Phone: ${invoice.institute_phone}`, invoice.institute_email]
      .filter(Boolean)
      .join('   |   '),
    // GSTIN is optional and printed only when the institute configured one.
    invoice.institute_gstin ? `GSTIN: ${invoice.institute_gstin}` : null,
  ].filter(Boolean);
  headerLines.slice(0, 3).forEach((line, i) => doc.text(line, margin, 19 + i * 4.4));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('FEE INVOICE', pageWidth - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(invoice.invoice_number || '—', pageWidth - margin, 19, { align: 'right' });

  // ---------- Billed-to + invoice meta ----------
  const boxTop = 40;
  const boxHeight = 30;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, boxTop, contentWidth, boxHeight, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('BILLED TO', margin + 4, boxTop + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(invoice.student_name || 'Student', margin + 4, boxTop + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  [
    invoice.student_code ? `Student ID: ${invoice.student_code}` : null,
    invoice.batch_name ? `Batch: ${invoice.batch_name}` : null,
    invoice.course_name ? `Course: ${invoice.course_name}` : null,
  ]
    .filter(Boolean)
    .forEach((line, i) => doc.text(line, margin + 4, boxTop + 20 + i * 4.4));

  const metaX = margin + contentWidth / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE DETAILS', metaX, boxTop + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  [
    ['Invoice No.', invoice.invoice_number || '—'],
    ['Invoice Date', prettyDate(invoice.created_at || invoice.payment_date)],
    ['Payment Date', prettyDate(invoice.payment_date)],
    ['Method', formatPaymentMethodLabel(invoice.payment_method)],
    ['Reference', invoice.reference_number || '—'],
  ].forEach(([k, v], i) => {
    const ry = boxTop + 14 + i * 4.4;
    doc.setTextColor(100, 116, 139);
    doc.text(k, metaX, ry);
    doc.setTextColor(15, 23, 42);
    doc.text(String(v), pageWidth - margin - 4, ry, { align: 'right' });
  });

  let y = boxTop + boxHeight + 8;

  // ---------- Amounts table ----------
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Amount (INR)']],
    body: [
      ['Tuition & Academic Fee', Number(invoice.fee_total || 0).toFixed(2)],
      ['Previous Due', Number(invoice.previous_due || 0).toFixed(2)],
      ['Amount Paid', Number(invoice.amount_paid || 0).toFixed(2)],
      ['Remaining Due', Number(invoice.remaining_due || 0).toFixed(2)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.4, textColor: [15, 23, 42] },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 42 } },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 1) data.cell.styles.textColor = [5, 150, 105];
      }
      if (data.row.index === 3 && data.column.index === 1) {
        data.cell.styles.textColor = [190, 24, 93];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ---------- Status stamp + total ----------
  const status = STATUS_LABEL[invoice.status] || STATUS_LABEL.paid;
  const isPaid = status === 'PAID';
  doc.setFillColor(isPaid ? 16 : 190, isPaid ? 185 : 24, isPaid ? 129 : 93);
  doc.roundedRect(margin, y, 34, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(status, margin + 17, y + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Paid:', margin + 40, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
      Number(invoice.amount_paid || 0)
    ),
    pageWidth - margin - 4,
    y + 6,
    { align: 'right' }
  );

  y += 18;

  // ---------- Footer ----------
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a computer-generated fee invoice. Amounts are snapshotted at the time of payment',
    margin,
    y + 5
  );
  doc.text('and are not affected by later changes to student, batch or fee records.', margin, y + 9.5);

  const filename = `${invoice.invoice_number || 'invoice'}.pdf`;
  doc.save(filename);
  return filename;
}

export async function generateStudentReportCard({ student, institute, attendance = [], results = [], remarks = '' }) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Dark slate slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(institute?.name || 'Academic Institute', 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('OFFICIAL STUDENT PERFORMANCE REPORT CARD', 14, 30);

  // Student Info Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Details', 14, 52);

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 55, pageWidth - 14, 55);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Student Name: ${student?.full_name || 'N/A'}`, 14, 64);
  doc.text(`Class / Standard: ${student?.standard || 'N/A'}`, 14, 72);
  doc.text(`Batch: ${student?.batch || 'N/A'}`, 14, 80);

  doc.text(`Parent Phone: ${student?.parent_phone || 'N/A'}`, pageWidth / 2 + 10, 64);
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2 + 10, 72);
  doc.text(`Academic Session: ${new Date().getFullYear()}`, pageWidth / 2 + 10, 80);

  // Attendance Summary Section
  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => ['present', 'late'].includes(String(a.status).toLowerCase())).length;
  const attendancePercent = totalDays ? Math.round((presentDays / totalDays) * 100) : 'N/A';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Attendance Performance (Last 30 Days)', 14, 96);
  doc.line(14, 99, pageWidth - 14, 99);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Recorded Days: ${totalDays}`, 14, 107);
  doc.text(`Days Present: ${presentDays}`, 80, 107);
  doc.text(`Attendance Score: ${attendancePercent}${typeof attendancePercent === 'number' ? '%' : ''}`, 145, 107);

  // Test Results Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Test & Examination Results', 14, 122);

  const tableRows = results.map((r, idx) => {
    const marks = Number(r.marks ?? r.marks_obtained ?? 0);
    const total = Number(r.total_marks ?? 100);
    const pct = r.percentage ?? (total > 0 ? Math.round((marks / total) * 100) : 0);
    return [
      idx + 1,
      r.test_name || r.title || `Test ${idx + 1}`,
      r.subject || 'General',
      `${marks} / ${total}`,
      `${pct}%`,
      r.rank ? `#${r.rank}` : 'N/A',
    ];
  });

  autoTable(doc, {
    startY: 126,
    head: [['#', 'Test Title', 'Subject', 'Marks', 'Percentage', 'Rank']],
    body: tableRows.length ? tableRows : [['-', 'No tests recorded yet', '-', '-', '-', '-']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // Remarks Section
  const finalY = (doc).lastAutoTable?.finalY ? (doc).lastAutoTable.finalY + 15 : 180;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Teacher Remarks & Assessment', 14, finalY);
  doc.line(14, finalY + 3, pageWidth - 14, finalY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const remarkText = remarks || 'Student shows consistent effort. Continued focus on test revision recommended.';
  doc.text(doc.splitTextToSize(remarkText, pageWidth - 28), 14, finalY + 12);

  // Signatures at bottom
  const bottomY = finalY + 45;
  doc.setDrawColor(148, 163, 184);
  doc.line(14, bottomY, 70, bottomY);
  doc.text('Class Teacher Signature', 14, bottomY + 6);

  doc.line(pageWidth - 70, bottomY, pageWidth - 14, bottomY);
  doc.text('Principal / Director Seal', pageWidth - 70, bottomY + 6);

  // Save PDF
  const filename = `${(student?.full_name || 'Student').replace(/\s+/g, '_')}_Report_Card.pdf`;
  doc.save(filename);
}

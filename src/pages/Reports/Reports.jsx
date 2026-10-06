import { useState } from 'react';
import { useReports } from '../../hooks/useReports';
import { useStudents } from '../../hooks/useStudents';
import { useInstitute } from '../../contexts/InstituteContext';
import { generateStudentReportCard } from '../../utils/generateReportCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { AlertCircle, BarChart3, CheckCircle2, Download, DollarSign, FileText, Printer, TrendingUp, UserPlus, Users } from 'lucide-react';

export default function Reports() {
  const { institute } = useInstitute();
  const {
    feeReport,
    financialReport,
    attendanceReport,
    admissionsReport,
    loading,
    error,
    fetchStudentCard,
    exportCSV,
  } = useReports();
  const { data: students = [] } = useStudents();

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [remarks, setRemarks] = useState('');

  if (loading) return <Loader label="Generating comprehensive business & academic reports..." />;

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">ERP Reports Hub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Generate executive financial statements, student report cards, and fee ledgers.</p>
        </div>
        <Card className="border-rose-500/30">
          <div className="flex gap-3 text-rose-600 dark:text-rose-200">
            <AlertCircle className="shrink-0" />
            <div>
              <h2 className="font-semibold">Reports could not be loaded</h2>
              <p className="mt-1 text-sm">{error.message || String(error)}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const handleExportFeeReport = () => {
    if (!feeReport) return;
    const rows = feeReport.feeRows.length
      ? feeReport.feeRows
      : [
          {
            Total_Collected: feeReport.totalCollected,
            Total_Pending: feeReport.totalPending,
            Total_Expected: feeReport.totalExpected,
          },
        ];
    exportCSV('Institute_Fee_Report.csv', rows);
  };

  const handleExportFinancialReport = () => {
    if (!financialReport) return;
    const rows = [
      {
        Gross_Revenue: financialReport.totalRevenue,
        Direct_Expenses: financialReport.directExpenses,
        Payroll_Expenses: financialReport.payrollExpenses,
        Total_Expenses: financialReport.totalExpenses,
        Net_Profit: financialReport.netProfit,
      },
    ];
    exportCSV('Financial_PNL_Report.csv', rows);
  };

  const handleExportAttendanceReport = () => {
    if (!attendanceReport) return;
    const rows = [
      {
        Total_Sessions: attendanceReport.totalRecords,
        Present_Marks: attendanceReport.presentCount,
        Absent_Marks: attendanceReport.absentCount,
        Overall_Attendance_Percentage: `${attendanceReport.attendancePercentage}%`,
      },
    ];
    exportCSV('Institute_Attendance_Report.csv', rows);
  };

  const handleExportAdmissionsReport = () => {
    if (!admissionsReport) return;
    const rows = admissionsReport.enquiriesRows.length
      ? admissionsReport.enquiriesRows
      : [
          {
            Total_Enquiries: admissionsReport.totalEnquiries,
            Enrolled_Count: admissionsReport.enrolledCount,
            Conversion_Rate: `${admissionsReport.conversionRate}%`,
          },
        ];
    exportCSV('Admissions_Pipeline_Report.csv', rows);
  };

  const handleGenerateStudentReportCard = async () => {
    if (!students.length) return;
    const targetStudent = students.find((s) => String(s.id) === String(selectedStudentId)) || students[0];
    if (!targetStudent) return;

    setGeneratingPdf(true);
    try {
      const cardData = await fetchStudentCard(targetStudent.id);
      if (cardData) {
        generateStudentReportCard({
          student: cardData.student,
          institute,
          attendance: cardData.attendance,
          results: cardData.results,
          remarks: remarks || 'Student demonstrates steady academic performance. Regular revision recommended.',
        });
      }
    } catch (err) {
      console.error('Report card generation error:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">ERP Reports Hub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Generate executive financial statements, student report cards, and fee ledgers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Student Academic Report Card Generator */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Student Academic Report Card</h2>
              <p className="text-xs text-slate-500">Generate printable PDF report card with live attendance % and test scores.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- Select Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.name} ({s.standard || 'Class'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Teacher Assessment Remarks</label>
              <input
                type="text"
                placeholder="Optional teacher remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <Button onClick={handleGenerateStudentReportCard} disabled={generatingPdf || !students.length} className="w-full justify-center">
              <Printer size={16} className="mr-2" /> {generatingPdf ? 'Generating PDF...' : 'Generate PDF Report Card'}
            </Button>
          </div>
        </Card>

        {/* Fee Collection Report */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fee Collection & Dues Statement</h2>
              <p className="text-xs text-slate-500">Overview of paid collections vs pending fee balances.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-slate-500">Total Collected:</span>
              <span className="font-bold text-emerald-600">₹{(feeReport?.totalCollected || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-slate-500">Total Pending Dues:</span>
              <span className="font-bold text-rose-600">₹{(feeReport?.totalPending || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-slate-500">Pending Dues Students:</span>
              <span className="font-bold text-slate-900 dark:text-white">{feeReport?.pendingStudentsCount || 0} students</span>
            </div>

            <Button variant="outline" onClick={handleExportFeeReport} className="mt-4 w-full justify-center">
              <Download size={16} className="mr-2" /> Export Fee Statement (CSV)
            </Button>
          </div>
        </Card>

        {/* Financial P&L Executive Statement */}
        <Card className="p-6 md:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <BarChart3 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Financial Profit & Loss Statement</h2>
                <p className="text-xs text-slate-500">Gross operational revenue vs expense deductions & payroll.</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExportFinancialReport}>
              <Download size={16} className="mr-2" /> Export P&L (CSV)
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Gross Income</div>
              <div className="text-xl font-bold text-emerald-600">₹{(financialReport?.totalRevenue || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Direct Expenses</div>
              <div className="text-xl font-bold text-amber-600">₹{(financialReport?.directExpenses || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Staff Payroll Expenses</div>
              <div className="text-xl font-bold text-rose-600">₹{(financialReport?.payrollExpenses || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Net Operational Margin</div>
              <div className="text-xl font-bold text-indigo-600">₹{(financialReport?.netProfit || 0).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        {/* Attendance Summary Report */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Summary</h2>
                <p className="text-xs text-slate-500">Institute-wide session marking percentages.</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExportAttendanceReport}>
              <Download size={16} className="mr-2" /> CSV
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-[10px] text-slate-500">Sessions</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{attendanceReport?.totalRecords || 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-[10px] text-slate-500">Present Marks</div>
              <div className="text-lg font-bold text-emerald-600">{attendanceReport?.presentCount || 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-[10px] text-slate-500">Overall Rate</div>
              <div className="text-lg font-bold text-blue-600">{attendanceReport?.attendancePercentage || 0}%</div>
            </div>
          </div>
        </Card>

        {/* Admissions & Enquiry Conversion Report */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admissions & Pipeline</h2>
                <p className="text-xs text-slate-500">Enquiry leads and enrollment conversion rate.</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExportAdmissionsReport}>
              <Download size={16} className="mr-2" /> CSV
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-[10px] text-slate-500">Total Leads</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{admissionsReport?.totalEnquiries || 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-[10px] text-slate-500">Enrolled</div>
              <div className="text-lg font-bold text-emerald-600">{admissionsReport?.enrolledCount || 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-[10px] text-slate-500">Conversion</div>
              <div className="text-lg font-bold text-amber-600">{admissionsReport?.conversionRate || 0}%</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


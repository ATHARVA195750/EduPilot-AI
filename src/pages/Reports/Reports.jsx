import { useState } from 'react';
import { useReports } from '../../hooks/useReports';
import { useStudents } from '../../hooks/useStudents';
import { generateStudentReportCard } from '../../utils/generateReportCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { FileText, Download, Printer, Filter, BarChart3, Users, DollarSign } from 'lucide-react';

export default function Reports() {
  const { feeReport, financialReport, loading, exportCSV } = useReports();
  const { data: students = [] } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState('');

  if (loading) return <Loader label="Generating comprehensive business & academic reports..." />;

  const handleExportFeeReport = () => {
    exportCSV('Institute_Fee_Report.csv', [
      { Total_Collected: feeReport.totalCollected, Total_Pending: feeReport.totalPending, Total_Expected: feeReport.totalExpected }
    ]);
  };

  const handleExportFinancialReport = () => {
    exportCSV('Financial_PNL_Report.csv', [
      { Gross_Revenue: financialReport.totalRevenue, Total_Expenses: financialReport.totalExpenses, Net_Profit: financialReport.netProfit }
    ]);
  };

  const handleGenerateStudentReportCard = () => {
    const st = students.find(s => s.id === selectedStudentId) || students[0];
    generateStudentReportCard({
      student: st,
      attendance: [],
      results: []
    });
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
        {/* Student Report Card Generator */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Student Academic Report Card</h2>
              <p className="text-xs text-slate-500">Generate printable PDF report card with attendance % and grades.</p>
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
                <option value="">-- Choose Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.standard || 'Class'})</option>
                ))}
              </select>
            </div>

            <Button onClick={handleGenerateStudentReportCard} className="w-full justify-center">
              <Printer size={16} className="mr-2" /> Generate PDF Report Card
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
              <span className="font-bold text-emerald-600">₹{feeReport?.totalCollected?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-slate-500">Total Pending Dues:</span>
              <span className="font-bold text-rose-600">₹{feeReport?.totalPending?.toLocaleString()}</span>
            </div>

            <Button variant="outline" onClick={handleExportFeeReport} className="w-full justify-center mt-4">
              <Download size={16} className="mr-2" /> Export Fee Statement (CSV)
            </Button>
          </div>
        </Card>

        {/* Financial P&L Executive Statement */}
        <Card className="p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <BarChart3 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Financial Profit & Loss Statement</h2>
                <p className="text-xs text-slate-500">Gross operational revenue vs expense deductions.</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExportFinancialReport}>
              <Download size={16} className="mr-2" /> Export P&L (CSV)
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Gross Income</div>
              <div className="text-xl font-bold text-emerald-600">₹{financialReport?.totalRevenue?.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Operating Expenses</div>
              <div className="text-xl font-bold text-rose-600">₹{financialReport?.totalExpenses?.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-xs text-slate-500">Net Operational Margin</div>
              <div className="text-xl font-bold text-indigo-600">₹{financialReport?.netProfit?.toLocaleString()}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

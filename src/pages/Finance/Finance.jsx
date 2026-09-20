import { useState } from 'react';
import { useFinance } from '../../hooks/useFinance';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Plus } from 'lucide-react';

export default function Finance() {
  const { expenses, summary, loading, recordExpense } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Rent',
    amount: 5000,
    payment_method: 'Bank Transfer',
    description: '',
    added_by: 'Admin User'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await recordExpense({
      ...formData,
      amount: Number(formData.amount)
    });
    setIsModalOpen(false);
    setFormData({
      title: '',
      category: 'Rent',
      amount: 5000,
      payment_method: 'Bank Transfer',
      description: '',
      added_by: 'Admin User'
    });
  };

  if (loading) return <Loader label="Computing institute P&L financial metrics..." />;

  const columns = [
    {
      header: 'Expense Item',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{row.title}</div>
          <div className="text-xs text-slate-500">{row.description || 'Operating expense.'}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: (row) => (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {row.category}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="font-bold text-rose-600 dark:text-rose-400">
          - ₹{Number(row.amount)?.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: (row) => (
        <span className="text-xs text-slate-500">{row.expense_date}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Financial P&L & Expense Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Executive financial management, operational expenses, and net profit ledger.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" /> Log Expense
        </Button>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Gross Revenue</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{summary.totalRevenue.toLocaleString()}</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <TrendingDown size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Expenses</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">₹{summary.totalExpenses.toLocaleString()}</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Net Profit / Income</div>
            <div className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
              ₹{summary.netIncome.toLocaleString()}
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="rounded-2xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <PieChart size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Net Profit Margin</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.marginPercentage}%</div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Operational Expense Ledger</h2>
        {expenses.length === 0 ? (
          <EmptyState title="No Expenses Logged" description="Operational expenses will appear here." />
        ) : (
          <Table columns={columns} data={expenses} />
        )}
      </Card>

      {/* Add Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Operating Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Expense Title" required placeholder="e.g. September Rent / Electricity Bill" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities (Electricity/Internet)</option>
                <option value="Stationery">Stationery & Printing</option>
                <option value="Salaries">Staff Salaries</option>
                <option value="Marketing">Marketing & Ads</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <Input label="Amount (₹)" type="number" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

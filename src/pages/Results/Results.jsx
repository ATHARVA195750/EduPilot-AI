import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useResults } from '../../hooks/useResults';
import { useStudents } from '../../hooks/useStudents';
import { useTests } from '../../hooks/useTests';
import { createResult } from '../../services/resultService';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import {
  Award,
  Plus,
  Printer,
  Search,
  AlertCircle,
  FileCheck,
  Calendar,
  User,
  CheckCircle2,
} from 'lucide-react';

export function calculateGrade(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 0) return 'N/A';
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B';
  if (p >= 60) return 'C';
  if (p >= 50) return 'D';
  return 'F';
}

function getGradeBadgeColor(grade) {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'B':
    case 'C':
      return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    case 'D':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'F':
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20';
    default:
      return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20';
  }
}

export default function Results() {
  const { institute } = useInstitute();
  const { data: results = [], isLoading, error } = useResults();
  const { data: students = [] } = useStudents();
  const { data: tests = [] } = useTests();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTestId, setFilterTestId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    student_id: '',
    test_id: '',
    marks: '',
    total_marks: '100',
    rank: '',
    remarks: '',
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      test_id: '',
      marks: '',
      total_marks: '100',
      rank: '',
      remarks: '',
    });
  };

  const calculatedPercentage = useMemo(() => {
    const marks = Number(formData.marks);
    const total = Number(formData.total_marks);
    if (!formData.marks || isNaN(marks) || isNaN(total) || total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((marks / total) * 100)));
  }, [formData.marks, formData.total_marks]);

  const calculatedGrade = useMemo(() => {
    if (!formData.marks) return '—';
    return calculateGrade(calculatedPercentage);
  }, [formData.marks, calculatedPercentage]);

  // Map student and test details cleanly
  const studentMap = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      map.set(s.id, {
        name: s.full_name || s.name || 'Unknown Student',
        batch: s.batch_name || s.standard || 'General',
      });
    });
    return map;
  }, [students]);

  const testMap = useMemo(() => {
    const map = new Map();
    tests.forEach((t) => {
      map.set(t.id, {
        title: t.title || t.test_name || 'Assessment Test',
        subject: t.subject || 'General Subject',
        total_marks: t.total_marks || 100,
      });
    });
    return map;
  }, [tests]);

  // Filtered Results list
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const studentInfo = studentMap.get(r.student_id) || { name: r.students?.full_name || r.student_id };
      const testInfo = testMap.get(r.test_id) || { title: r.tests?.title || r.tests?.test_name || '' };

      const matchesSearch =
        !searchTerm ||
        studentInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testInfo.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTest = !filterTestId || r.test_id === filterTestId;

      return matchesSearch && matchesTest;
    });
  }, [results, studentMap, testMap, searchTerm, filterTestId]);

  const handleOpenModal = () => {
    resetForm();
    if (students.length > 0) {
      setFormData((prev) => ({ ...prev, student_id: students[0].id }));
    }
    if (tests.length > 0) {
      const firstTest = tests[0];
      setFormData((prev) => ({
        ...prev,
        test_id: firstTest.id,
        total_marks: String(firstTest.total_marks || 100),
      }));
    }
    setIsOpen(true);
  };

  const handleTestChange = (testId) => {
    const selectedTest = tests.find((t) => t.id === testId);
    setFormData((prev) => ({
      ...prev,
      test_id: testId,
      total_marks: selectedTest?.total_marks ? String(selectedTest.total_marks) : prev.total_marks,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.student_id) {
      toast('Please select a student.', 'error');
      return;
    }

    const marksNum = Number(formData.marks);
    const totalNum = Number(formData.total_marks);

    if (isNaN(marksNum) || marksNum < 0) {
      toast('Please enter valid marks obtained (0 or greater).', 'error');
      return;
    }

    if (isNaN(totalNum) || totalNum <= 0) {
      toast('Please enter valid total marks (greater than 0).', 'error');
      return;
    }

    if (marksNum > totalNum) {
      toast(`Marks obtained (${marksNum}) cannot exceed total marks (${totalNum}).`, 'error');
      return;
    }

    setIsSubmitting(true);
    const pct = Math.round((marksNum / totalNum) * 100);

    const payload = {
      student_id: formData.student_id,
      test_id: formData.test_id || null,
      marks: marksNum,
      total_marks: totalNum,
      percentage: pct,
      rank: formData.rank ? Number(formData.rank) : null,
      remarks: formData.remarks?.trim() || null,
    };

    try {
      await createResult(payload);
      await queryClient.invalidateQueries({ queryKey: ['results', institute?.id] });
      toast('Academic evaluation result saved successfully.');
      setIsOpen(false);
      resetForm();
    } catch (err) {
      console.error('Save result error:', err);
      const isRls = err.message?.includes('row-level security') || err.code === '42501' || err.status === 403;
      toast(
        isRls
          ? 'Authorization Error: You do not have permission to insert results for this student.'
          : (err.message || 'Failed to save student result.'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader label="Loading student academic performance records..." />;
  if (error) {
    return (
      <Card className="p-6 border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-rose-400 shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-rose-200">Error Loading Results</h3>
            <p className="text-sm mt-0.5">{error.message}</p>
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
            <Award className="text-indigo-500" size={26} />
            Academic Results & Evaluation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Record student marks, calculate automated percentages, track performance grades, and print transcripts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => window.print()} className="gap-2">
            <Printer size={16} /> Print / Export PDF
          </Button>
          <Button onClick={handleOpenModal} className="gap-2">
            <Plus size={16} /> Enter Marks
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name or test..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          {tests.length > 0 && (
            <div className="w-full sm:w-64">
              <select
                value={filterTestId}
                onChange={(e) => setFilterTestId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                  All Assessment Tests
                </option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {t.title || t.test_name} ({t.subject || 'Subject'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Results Table */}
      {filteredResults.length === 0 ? (
        <EmptyState
          title="No Academic Results Found"
          description={
            searchTerm || filterTestId
              ? 'No result records match your current search parameters.'
              : 'Click "Enter Marks" above to record evaluation marks for students.'
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Assessment Test</th>
                  <th className="py-3.5 px-4 text-center">Marks Obtained</th>
                  <th className="py-3.5 px-4 text-center">Percentage</th>
                  <th className="py-3.5 px-4 text-center">Grade</th>
                  <th className="py-3.5 px-4 text-center">Rank</th>
                  <th className="py-3.5 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                {filteredResults.map((r) => {
                  const studentData = studentMap.get(r.student_id) || {
                    name: r.students?.full_name || 'Student ID: ' + r.student_id.slice(0, 8),
                    batch: r.students?.batches?.name || r.students?.standard || '',
                  };

                  const testData = testMap.get(r.test_id) || {
                    title: r.tests?.title || r.tests?.test_name || 'General Assessment',
                    subject: r.tests?.subject || '',
                  };

                  const percentage = r.percentage ?? Math.round((Number(r.marks) / Number(r.total_marks || 100)) * 100);
                  const grade = calculateGrade(percentage);
                  const badgeColor = getGradeBadgeColor(grade);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Student Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                            {studentData.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {studentData.name}
                            </span>
                            {studentData.batch && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {studentData.batch}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Assessment Test */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {testData.title}
                        </span>
                        {testData.subject && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Subject: {testData.subject}
                          </span>
                        )}
                      </td>

                      {/* Marks Obtained */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {r.marks} <span className="text-xs font-normal text-slate-400">/ {r.total_marks || 100}</span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {percentage}%
                        </span>
                      </td>

                      {/* Grade (Calculated locally, high-contrast badge) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}
                        >
                          {grade}
                        </span>
                      </td>

                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {r.rank ? `#${r.rank}` : '—'}
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {r.remarks || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Enter Marks Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Enter Student Assessment Marks">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Student *
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                -- Choose Student --
              </option>
              {students.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {s.full_name || s.name || 'Student'} {s.batch_name ? `(${s.batch_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Test Selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Assessment Test (Optional)
            </label>
            <select
              value={formData.test_id}
              onChange={(e) => handleTestChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                -- General Evaluation (No Specific Test) --
              </option>
              {tests.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {t.title || t.test_name} ({t.subject || 'Subject'})
                </option>
              ))}
            </select>
          </div>

          {/* Marks & Total Marks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Marks Obtained *"
              type="number"
              required
              min={0}
              placeholder="e.g. 85"
              value={formData.marks}
              onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
            />
            <Input
              label="Total Marks *"
              type="number"
              required
              min={1}
              placeholder="e.g. 100"
              value={formData.total_marks}
              onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
            />
          </div>

          {/* Live Calculated Percentage & Grade Preview */}
          {formData.marks !== '' && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">
                  Automated Calculation
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {calculatedPercentage}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Calculated Grade</span>
                <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold ${getGradeBadgeColor(calculatedGrade)}`}>
                  {calculatedGrade}
                </span>
              </div>
            </div>
          )}

          {/* Rank & Remarks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Rank (Optional)"
              type="number"
              min={1}
              placeholder="e.g. 1"
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
            />
            <Input
              label="Remarks / Comments (Optional)"
              type="text"
              placeholder="e.g. Excellent performance"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.student_id || formData.marks === ''}>
              {isSubmitting ? 'Saving Result...' : 'Save Result'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

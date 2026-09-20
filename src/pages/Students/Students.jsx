import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, Pencil, UserRound, Plus, GraduationCap, Filter } from 'lucide-react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useStudents } from '../../hooks/useStudents';
import { useCourses } from '../../hooks/useCourses';
import { useBatches } from '../../hooks/useBatches';
import { deleteStudent } from '../../services/studentService';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';

export default function Students() {
  const { data: students = [], isLoading, error } = useStudents();
  const { courses } = useCourses();
  const { batches } = useBatches();
  const { instituteId } = useInstitute();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [standardFilter, setStandardFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const standardsList = useMemo(() => {
    return [...new Set(students.map((s) => s.standard).filter(Boolean))];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.full_name?.toLowerCase().includes(q) ||
        s.student_id_code?.toLowerCase().includes(q) ||
        s.parent_phone?.includes(q) ||
        s.parent_name?.toLowerCase().includes(q);

      const matchesCourse = !courseFilter || s.course_id === courseFilter;
      const matchesBatch = !batchFilter || s.batch_id === batchFilter;
      const matchesStatus = !statusFilter || s.status === statusFilter;
      const matchesStandard = !standardFilter || s.standard === standardFilter;

      return matchesSearch && matchesCourse && matchesBatch && matchesStatus && matchesStandard;
    });
  }, [students, search, courseFilter, batchFilter, statusFilter, standardFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visibleStudents = useMemo(() => {
    return filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredStudents, page]);

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate student "${name}"?`)) return;
    try {
      await deleteStudent(id, instituteId);
      await queryClient.invalidateQueries({ queryKey: ['students', instituteId] });
      toast(`Student record updated to Inactive.`);
    } catch (err) {
      toast(err.message || 'Unable to update student status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Directory & Roster
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View, manage, and enroll students across institute courses and class batches.
          </p>
        </div>
        <Link to="/students/add">
          <Button>
            <Plus size={16} className="mr-2" /> Add New Student
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        {/* Filters & Search Toolbar */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student name, ID code, or guardian phone..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>
            Total Enrolled: <strong className="text-slate-900 dark:text-white">{filteredStudents.length}</strong> students
          </span>
          <span>Showing page {page} of {totalPages}</span>
        </div>

        {/* Table List */}
        {isLoading ? (
          <Loader label="Loading student roster..." />
        ) : error ? (
          <div className="py-8 text-center text-sm text-rose-500">
            Failed to load student roster. Please try again.
          </div>
        ) : visibleStudents.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={search || courseFilter || batchFilter ? "No matching students found" : "No Students Registered"}
            description={
              search || courseFilter || batchFilter
                ? "Try clearing your filters or search terms."
                : "Register your first student to start managing academic enrollments."
            }
          />
        ) : (
          <Table>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Student ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Standard</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Active Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
                {visibleStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 transition"
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    <td className="px-4 py-4 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {student.student_id_code || student.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                      {student.full_name}
                      {student.parent_phone && (
                        <div className="text-[11px] font-normal text-slate-400">
                          Contact: {student.parent_phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">{student.standard || 'Class 10th'}</td>
                    <td className="px-4 py-4 text-xs font-medium">{student.course_name}</td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {student.batch_name}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          student.status === 'Inactive'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {student.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/students/edit/${student.id}`);
                          }}
                          aria-label="Edit student"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivate(student.id, student.full_name);
                          }}
                          aria-label="Deactivate student"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        )}

        {/* Pagination Bar */}
        {filteredStudents.length > pageSize && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

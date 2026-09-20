import { useState, useMemo } from 'react';
import { useBatches } from '../../hooks/useBatches';
import { useCourses } from '../../hooks/useCourses';
import { useBranches } from '../../hooks/useBranches';
import { useStudents } from '../../hooks/useStudents';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import {
  Users,
  Clock,
  Plus,
  UserCheck,
  ArrowRightLeft,
  Search,
  Building2,
  BookOpen,
  Edit2,
  Eye,
} from 'lucide-react';

export default function Batches() {
  const { batches, loading, addBatch, editBatch, transferStudent } = useBatches();
  const { courses } = useCourses();
  const { branches } = useBranches();
  const { data: students = [] } = useStudents();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    branch_id: '',
    room_number: '',
    max_capacity: 40,
    start_time: '18:00',
    end_time: '19:30',
    status: 'Active',
  });

  const [transferData, setTransferData] = useState({
    student_id: '',
    new_batch_id: '',
  });

  const filteredBatches = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return batches;
    return batches.filter(
      (b) =>
        b.name?.toLowerCase().includes(query) ||
        b.course_name?.toLowerCase().includes(query) ||
        b.branch_name?.toLowerCase().includes(query) ||
        b.teacher_names?.toLowerCase().includes(query) ||
        b.room_number?.toLowerCase().includes(query)
    );
  }, [batches, search]);

  const openAddModal = () => {
    setFormData({
      name: '',
      course_id: courses[0]?.id || '',
      branch_id: branches[0]?.id || '',
      room_number: 'Room 101',
      max_capacity: 40,
      start_time: '18:00',
      end_time: '19:30',
      status: 'Active',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name || '',
      course_id: batch.course_id || courses[0]?.id || '',
      branch_id: batch.branch_id || branches[0]?.id || '',
      room_number: batch.room_number || '',
      max_capacity: batch.max_capacity || 40,
      start_time: batch.start_time || '18:00',
      end_time: batch.end_time || '19:30',
      status: batch.status || 'Active',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await addBatch(formData);
      toast('Batch created successfully.');
      setIsAddModalOpen(false);
    } catch (err) {
      toast(err.message || 'Failed to create batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBatch || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await editBatch(editingBatch.id, formData);
      toast('Batch updated successfully.');
      setEditingBatch(null);
    } catch (err) {
      toast(err.message || 'Failed to update batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.student_id || !transferData.new_batch_id) {
      toast('Please select both a student and a target batch.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await transferStudent(transferData.student_id, transferData.new_batch_id);
      toast('Student transferred to new batch successfully.');
      setIsTransferModalOpen(false);
      setTransferData({ student_id: '', new_batch_id: '' });
    } catch (err) {
      toast(err.message || 'Failed to transfer student.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading active institute batches..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Batch Management & Allocations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organize student batches, assign courses, campus branches, room space, and capacity limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsTransferModalOpen(true)}>
            <ArrowRightLeft size={16} className="mr-2" /> Transfer Student
          </Button>
          <Button onClick={openAddModal}>
            <Plus size={16} className="mr-2" /> Create Batch
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch name, course, branch, room, or faculty..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredBatches.length}</span> of {batches.length} batches
        </div>
      </div>

      {/* Batch Cards Grid */}
      {filteredBatches.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matching batches found' : 'No Active Batches'}
          description={
            search
              ? 'Try refining your search terms.'
              : 'Create your first batch to allocate enrolled students and manage classroom schedules.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => {
            const enrolled = batch.enrolled_count || 0;
            const capacity = batch.max_capacity || 40;
            const capacityPct = Math.min(100, Math.round((enrolled / capacity) * 100));

            return (
              <Card key={batch.id} className="flex flex-col justify-between p-6 hover:shadow-lg transition">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {batch.room_number || 'Room 101'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        batch.status === 'Inactive'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {batch.status || 'Active'}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{batch.name}</h3>

                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      <BookOpen size={13} /> {batch.course_name || 'General Course'}
                    </div>
                    {batch.branch_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Building2 size={13} /> {batch.branch_name}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <UserCheck size={14} className="text-indigo-500 shrink-0" />
                      <span>
                        <strong>Assigned Faculty:</strong> {batch.teacher_names || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-indigo-500 shrink-0" />
                      <span>
                        <strong>Timing:</strong> {batch.start_time || '18:00'} - {batch.end_time || '19:30'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Users size={14} /> Capacity Utilization
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {enrolled} / {capacity} ({capacityPct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        capacityPct >= 90 ? 'bg-rose-500' : capacityPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => setViewingBatch(batch)} title="View Details">
                      <Eye size={14} className="mr-1" /> View Details
                    </Button>
                    <Button variant="secondary" onClick={() => openEditModal(batch)} title="Edit Batch">
                      <Edit2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Batch Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Class Batch">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Batch Name"
            required
            placeholder="e.g. Class 10th - Batch A"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Course</label>
              <select
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.standard || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Campus Branch</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- Select Branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Room / Classroom"
              placeholder="e.g. Room 101 / Lab 2"
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
            />
            <Input
              label="Max Student Capacity"
              type="number"
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <Input
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Batch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal isOpen={Boolean(editingBatch)} onClose={() => setEditingBatch(null)} title="Edit Batch Information">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Batch Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Course</label>
              <select
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.standard || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Campus Branch</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- Select Branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Room / Classroom"
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
            />
            <Input
              label="Max Student Capacity"
              type="number"
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <Input
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingBatch(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Batch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Batch Details Modal */}
      <Modal isOpen={Boolean(viewingBatch)} onClose={() => setViewingBatch(null)} title={`Batch Overview — ${viewingBatch?.name}`}>
        {viewingBatch && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                  {viewingBatch.branch_name || 'Main Campus'}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                  {viewingBatch.status || 'Active'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewingBatch.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Course: <strong className="text-slate-800 dark:text-slate-200">{viewingBatch.course_name}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-slate-400 font-medium">Classroom / Room</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {viewingBatch.room_number || 'Room 101'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-slate-400 font-medium">Assigned Faculty (teacher_assignments)</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {viewingBatch.teacher_names || 'Unassigned'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-slate-400 font-medium">Class Timing</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {viewingBatch.start_time || '18:00'} - {viewingBatch.end_time || '19:30'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-slate-400 font-medium">Capacity Utilization</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {viewingBatch.enrolled_count || 0} / {viewingBatch.max_capacity || 40}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewingBatch(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer Student Modal */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transfer Student to Another Batch">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Enrolled Student</label>
            <select
              value={transferData.student_id}
              onChange={(e) => setTransferData({ ...transferData, student_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- Choose Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.standard || 'Class'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target New Batch</label>
            <select
              value={transferData.new_batch_id}
              onChange={(e) => setTransferData({ ...transferData, new_batch_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- Choose Target Batch --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.room_number || 'Room'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Transferring...' : 'Transfer Student'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useCourses } from '../../hooks/useCourses';
import { useSubjects } from '../../hooks/useSubjects';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { BookOpen, Plus, Tag, Search, Edit2, Trash2, Layers, CheckCircle, XCircle } from 'lucide-react';

export default function Courses() {
  const { courses, loading, addCourse, editCourse } = useCourses();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [managingSubjectsCourse, setManagingSubjectsCourse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    standard: 'Class 10th',
    board: 'CBSE',
    duration_months: 12,
    base_fee: 18000,
    description: '',
    status: 'Active',
  });

  const filteredCourses = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return courses;
    return courses.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.standard?.toLowerCase().includes(query) ||
        c.board?.toLowerCase().includes(query) ||
        c.code?.toLowerCase().includes(query)
    );
  }, [courses, search]);

  const openAddModal = () => {
    setFormData({
      name: '',
      code: '',
      standard: 'Class 10th',
      board: 'CBSE',
      duration_months: 12,
      base_fee: 18000,
      description: '',
      status: 'Active',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name || '',
      code: course.code || '',
      standard: course.standard || 'Class 10th',
      board: course.board || 'CBSE',
      duration_months: course.duration_months || 12,
      base_fee: course.base_fee || 0,
      description: course.description || '',
      status: course.status || 'Active',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await addCourse(formData);
      toast('Course created successfully.');
      setIsAddModalOpen(false);
    } catch (err) {
      toast(err.message || 'Failed to create course.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCourse || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await editCourse(editingCourse.id, formData);
      toast('Course updated successfully.');
      setEditingCourse(null);
    } catch (err) {
      toast(err.message || 'Failed to update course.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading course catalogue..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Course & Subject Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure academic courses, board curriculum standards, base tuition fees, and subject structures.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} className="mr-2" /> Add New Course
        </Button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course name, standard, or board..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredCourses.length}</span> of {courses.length} courses
        </div>
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? "No matching courses found" : "No Courses Catalogued"}
          description={
            search
              ? "Try refining your search terms."
              : "Create your first academic course structure to start configuring batches and subjects."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const courseSubjects = Array.isArray(course.subjects)
              ? course.subjects
              : [];

            return (
              <Card key={course.id} className="flex flex-col justify-between p-6 hover:shadow-lg transition">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <BookOpen size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {course.board || 'CBSE'} • {course.standard || 'Class 10th'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          course.status === 'Inactive'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {course.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{course.name}</h3>
                  {course.code && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Code: {course.code}
                    </span>
                  )}
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                    {course.description || 'Standard academic curriculum course.'}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Subjects ({courseSubjects.length}):
                      </span>
                      <button
                        onClick={() => setManagingSubjectsCourse(course)}
                        className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Manage Subjects
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {courseSubjects.length > 0 ? (
                        courseSubjects.map((sub, idx) => (
                          <span
                            key={sub.id || idx}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Tag size={10} className="mr-1 text-indigo-500" /> {typeof sub === 'string' ? sub : sub.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-400">No subjects linked yet.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Base Fee</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(course.base_fee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Duration</div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {course.duration_months || 12} Months
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => openEditModal(course)}>
                      <Edit2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Course Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Course">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Course Name"
            required
            placeholder="e.g. Class 10th CBSE Comprehensive"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Course Code"
            placeholder="e.g. C10-CBSE"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Standard / Grade
              </label>
              <select
                value={formData.standard}
                onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Class 8th">Class 8th</option>
                <option value="Class 9th">Class 9th</option>
                <option value="Class 10th">Class 10th</option>
                <option value="Class 11th">Class 11th</option>
                <option value="Class 12th">Class 12th</option>
                <option value="JEE Prep">JEE Prep</option>
                <option value="NEET Prep">NEET Prep</option>
              </select>
            </div>
            <Input
              label="Board Curriculum"
              placeholder="CBSE / ICSE / State"
              value={formData.board}
              onChange={(e) => setFormData({ ...formData, board: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Base Fee (₹)"
              type="number"
              required
              value={formData.base_fee}
              onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
            />
            <Input
              label="Duration (Months)"
              type="number"
              required
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
            />
          </div>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={3}
              placeholder="Course description and objective..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Course'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal isOpen={Boolean(editingCourse)} onClose={() => setEditingCourse(null)} title="Edit Course Details">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Course Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Course Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Standard / Grade
              </label>
              <select
                value={formData.standard}
                onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Class 8th">Class 8th</option>
                <option value="Class 9th">Class 9th</option>
                <option value="Class 10th">Class 10th</option>
                <option value="Class 11th">Class 11th</option>
                <option value="Class 12th">Class 12th</option>
                <option value="JEE Prep">JEE Prep</option>
                <option value="NEET Prep">NEET Prep</option>
              </select>
            </div>
            <Input
              label="Board Curriculum"
              value={formData.board}
              onChange={(e) => setFormData({ ...formData, board: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Base Fee (₹)"
              type="number"
              required
              value={formData.base_fee}
              onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
            />
            <Input
              label="Duration (Months)"
              type="number"
              required
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
            />
          </div>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingCourse(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Course'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subject Manager Modal */}
      {managingSubjectsCourse && (
        <SubjectManagerModal
          course={managingSubjectsCourse}
          onClose={() => setManagingSubjectsCourse(null)}
        />
      )}
    </div>
  );
}

function SubjectManagerModal({ course, onClose }) {
  const { subjects, loading, addSubject, removeSubject } = useSubjects(course.id);
  const { toast } = useToast();

  const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.name.trim()) return;
    setIsAdding(true);
    try {
      await addSubject({
        course_id: course.id,
        name: newSubject.name.trim(),
        code: newSubject.code.trim(),
        description: newSubject.description.trim(),
      });
      toast(`Subject "${newSubject.name}" added to ${course.name}.`);
      setNewSubject({ name: '', code: '', description: '' });
    } catch (err) {
      toast(err.message || 'Failed to add subject.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await removeSubject(id);
      toast(`Subject "${name}" deleted.`);
    } catch (err) {
      toast(err.message || 'Failed to delete subject.', 'error');
    }
  };

  return (
    <Modal isOpen={Boolean(course)} onClose={onClose} title={`Manage Subjects — ${course.name}`}>
      <div className="space-y-5">
        {/* Add Subject Form */}
        <form onSubmit={handleAddSubject} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Add New Subject
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Subject Name"
              required
              placeholder="e.g. Physics / Algebra"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            />
            <Input
              label="Subject Code"
              placeholder="e.g. PHY-10"
              value={newSubject.code}
              onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
            />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1">
              <Input
                label="Description"
                placeholder="Optional description..."
                value={newSubject.description}
                onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={isAdding}>
              <Plus size={14} className="mr-1" /> {isAdding ? 'Adding...' : 'Add Subject'}
            </Button>
          </div>
        </form>

        {/* Existing Subjects List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 dark:text-slate-400">
            Current Course Subjects ({subjects.length})
          </h4>
          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No subjects registered for this course yet. Use the form above to add subjects.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {sub.name} {sub.code && <span className="text-slate-400 font-normal">({sub.code})</span>}
                    </div>
                    {sub.description && <div className="text-slate-500 text-[11px] mt-0.5">{sub.description}</div>}
                  </div>
                  <button
                    onClick={() => handleDeleteSubject(sub.id, sub.name)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete Subject"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

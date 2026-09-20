import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import {
  useHomework,
  useCreateHomework,
  useUpdateHomework,
  useDeleteHomework,
} from '../../hooks/useHomework';
import { useBatches } from '../../hooks/useBatches';
import { useSubjects } from '../../hooks/useSubjects';
import { useTeachers } from '../../hooks/useTeachers';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';

function Homework() {
  const { institute } = useInstitute();
  const { data: items = [], isLoading, error } = useHomework();
  const createMutation = useCreateHomework();
  const updateMutation = useUpdateHomework();
  const deleteMutation = useDeleteHomework();

  const { batches = [] } = useBatches();
  const { subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    standard: '',
    batch_id: '',
    subject_id: '',
    teacher_id: '',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      standard: '',
      batch_id: '',
      subject_id: '',
      teacher_id: '',
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      standard: item.standard || '',
      batch_id: item.batch_id || '',
      subject_id: item.subject_id || '',
      teacher_id: item.teacher_id || '',
      due_date: item.due_date ? String(item.due_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  };

  const handleDownload = async (fileUrl) => {
    if (!fileUrl || !supabase) return;
    try {
      if (fileUrl.startsWith('http')) {
        window.open(fileUrl, '_blank');
        return;
      }
      const { data, error: err } = await supabase.storage.from('homework-files').createSignedUrl(fileUrl, 3600);
      if (err) throw err;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (e) {
      toast('Unable to generate attachment download link.', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let fileUrl = editingItem?.file_url || null;

      if (fileInputRef.current?.files?.[0] && supabase) {
        const file = fileInputRef.current.files[0];
        const path = `${institute?.id || 'gen'}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage.from('homework-files').upload(path, file);
        if (!uploadErr && uploadData?.path) {
          fileUrl = uploadData.path;
        }
      }

      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          updates: {
            ...formData,
            file_url: fileUrl,
          },
        });
        toast('Homework assignment updated.');
        setEditingItem(null);
      } else {
        await createMutation.mutateAsync({
          ...formData,
          file_url: fileUrl,
        });
        toast('Homework assignment created.');
        setIsCreateOpen(false);
      }
      resetForm();
    } catch (err) {
      toast(err.message || 'Failed to save homework.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast('Homework deleted.');
      setDeletingId(null);
    } catch (err) {
      toast(err.message || 'Failed to delete homework.', 'error');
    }
  };

  const filteredItems = items.filter((x) => {
    const matchesSearch =
      !search ||
      x.title?.toLowerCase().includes(search.toLowerCase()) ||
      x.description?.toLowerCase().includes(search.toLowerCase());
    const matchesBatch = !selectedBatch || x.batch_id === selectedBatch || x.standard === selectedBatch;
    const matchesSubject = !selectedSubject || x.subject_id === selectedSubject || x.description?.includes(selectedSubject);
    return matchesSearch && matchesBatch && matchesSubject;
  });

  if (isLoading) return <Card className="p-8 text-center text-slate-400">Loading homework assignments...</Card>;
  if (error) return <Card className="p-6 text-rose-300">Error loading homework: {error.message}</Card>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Homework Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, assign, and track course assignments and homework tasks across batches.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} className="mr-1.5" /> Create Homework
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by assignment title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All Batches / Classes</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Card>

      {/* Homework Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length ? (
          filteredItems.map((x) => (
            <Card key={x.id} className="flex flex-col justify-between p-5 hover:shadow-lg transition">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <BookOpen size={12} className="mr-1" />
                    {x.subjects?.name || x.description || 'General Subject'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(x)}
                      className="p-1 text-slate-400 hover:text-indigo-500 transition"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingId(x.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{x.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {x.description || 'No detailed instructions specified.'}
                </p>

                <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    Batch: <strong className="text-slate-700 dark:text-slate-300">{x.batches?.name || x.standard || 'All Students'}</strong>
                  </div>
                  {x.teachers?.full_name && (
                    <div>
                      Assigned by: <span className="text-slate-700 dark:text-slate-300">{x.teachers.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-amber-500 font-semibold pt-1">
                    <Calendar size={13} />
                    <span>Due Date: {x.due_date ? new Date(x.due_date).toLocaleDateString('en-IN') : 'Not set'}</span>
                  </div>
                </div>
              </div>

              {x.file_url && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleDownload(x.file_url)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Download size={14} />
                    <span>Download Attachment</span>
                  </button>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
            No homework assignments found for the selected criteria.
          </Card>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        title={editingItem ? 'Edit Homework Assignment' : 'Create Homework Assignment'}
        isOpen={isCreateOpen || !!editingItem}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Assignment Title"
            required
            placeholder="e.g. Chapter 4 Practice Problems"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Batch</label>
              <select
                value={formData.batch_id}
                onChange={(e) => {
                  const b = batches.find((item) => item.id === e.target.value);
                  setFormData({ ...formData, batch_id: e.target.value, standard: b?.name || '' });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Due Date"
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Assigning Teacher</label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select Teacher (Optional)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description / Instructions</label>
            <textarea
              rows={3}
              placeholder="Enter detailed instructions for students..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Attach Worksheet / File (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white file:font-semibold hover:file:bg-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update Assignment' : 'Create Homework'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Confirm Deletion"
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-500">
            <AlertCircle size={24} />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Are you sure you want to delete this homework assignment?
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button onClick={() => handleDelete(deletingId)} className="bg-rose-600 hover:bg-rose-500 text-white">
              Delete Homework
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Homework;

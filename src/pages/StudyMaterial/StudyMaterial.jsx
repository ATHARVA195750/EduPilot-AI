import { useState, useRef } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import {
  useStudyMaterial,
  useCreateStudyMaterial,
  useUpdateStudyMaterial,
  useTogglePublishStudyMaterial,
  useDeleteStudyMaterial,
} from '../../hooks/useStudyMaterial';
import { useBatches } from '../../hooks/useBatches';
import { useSubjects } from '../../hooks/useSubjects';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Video,
  ExternalLink,
  Plus,
  BookOpen,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
} from 'lucide-react';

export default function StudyMaterial() {
  const { institute } = useInstitute();
  const { data: materials = [], isLoading, error } = useStudyMaterial();
  const createMutation = useCreateStudyMaterial();
  const updateMutation = useUpdateStudyMaterial();
  const togglePublishMutation = useTogglePublishStudyMaterial();
  const deleteMutation = useDeleteStudyMaterial();

  const { batches = [] } = useBatches();
  const { subjects = [] } = useSubjects();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    chapter: '',
    subject_id: '',
    batch_id: '',
    material_type: 'PDF',
    file_url: '',
    external_url: '',
    is_published: true,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      chapter: '',
      subject_id: '',
      batch_id: '',
      material_type: 'PDF',
      file_url: '',
      external_url: '',
      is_published: true,
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
      chapter: item.chapter || '',
      subject_id: item.subject_id || '',
      batch_id: item.batch_id || '',
      material_type: item.material_type || 'PDF',
      file_url: item.file_url || '',
      external_url: item.external_url || '',
      is_published: item.is_published !== undefined ? item.is_published : true,
    });
  };

  const handleTogglePublish = async (id, currentStatus) => {
    try {
      await togglePublishMutation.mutateAsync({ id, is_published: !currentStatus });
      toast(!currentStatus ? 'Study material published.' : 'Study material unpublished.');
    } catch (err) {
      toast(err.message || 'Failed to update publish status.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast('Study material deleted.');
      setDeletingId(null);
    } catch (err) {
      toast(err.message || 'Failed to delete study material.', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let fileUrl = formData.file_url || editingItem?.file_url || null;

      if (fileInputRef.current?.files?.[0] && supabase) {
        const file = fileInputRef.current.files[0];
        const path = `study_materials/${institute?.id || 'gen'}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage.from('study-materials').upload(path, file);
        if (!uploadErr && uploadData?.path) {
          fileUrl = uploadData.path;
        }
      }

      const selectedB = batches.find((b) => b.id === formData.batch_id);
      const selectedS = subjects.find((s) => s.id === formData.subject_id);

      const payload = {
        ...formData,
        subject: selectedS?.name || formData.subject,
        course_name: selectedB?.course_name || selectedB?.name || null,
        batch_name: selectedB?.name || null,
        file_url: fileUrl,
      };

      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          updates: payload,
        });
        toast('Study material updated.');
        setEditingItem(null);
      } else {
        await createMutation.mutateAsync(payload);
        toast('Study material published successfully.');
        setIsCreateOpen(false);
      }
      resetForm();
    } catch (err) {
      toast(err.message || 'Failed to save study material.', 'error');
    }
  };

  const filtered = materials.filter((m) => {
    const sLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      m.title?.toLowerCase().includes(sLower) ||
      m.subject?.toLowerCase().includes(sLower) ||
      m.chapter?.toLowerCase().includes(sLower);

    const matchesBatch = !selectedBatch || m.batch_id === selectedBatch || m.batch_name?.includes(selectedBatch);
    const matchesSubject = !selectedSubject || m.subject_id === selectedSubject || m.subject === selectedSubject;
    const matchesType = !selectedType || m.material_type === selectedType;

    return matchesSearch && matchesBatch && matchesSubject && matchesType;
  });

  if (isLoading) return <Loader label="Loading digital study material repository..." />;
  if (error) return <Card className="p-6 text-rose-300">Error loading study materials: {error.message}</Card>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Digital Study Material Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organized chapter-wise lecture notes, PDF worksheets, and video tutorials.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} className="mr-2" /> Upload Study Material
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by title, subject or chapter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All Material Formats</option>
          <option value="PDF">PDF Document</option>
          <option value="Video Link">Video Link</option>
          <option value="Document">Word Document</option>
          <option value="Image">Image</option>
          <option value="Link">External Link</option>
        </select>
      </Card>

      {/* Materials Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Study Materials Found"
          description="Uploaded PDF notes and video materials will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between p-6 hover:shadow-lg transition">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      item.material_type === 'Video Link'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    }`}
                  >
                    {item.material_type === 'Video Link' ? <Video size={12} className="mr-1" /> : <FileText size={12} className="mr-1" />}
                    {item.material_type}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePublish(item.id, item.is_published)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        item.is_published
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}
                      title={item.is_published ? 'Unpublish Resource' : 'Publish Resource'}
                    >
                      {item.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span>{item.is_published ? 'Published' : 'Draft'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1 text-slate-400 hover:text-indigo-500 transition"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{item.chapter || item.subject}</p>
                <div className="mt-2 text-xs text-slate-400">
                  Batch: <strong className="text-slate-700 dark:text-slate-300">{item.batches?.name || item.batch_name || 'All Batches'}</strong>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between dark:border-slate-800">
                {(item.file_url || item.external_url) ? (
                  <a
                    href={item.external_url || item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <ExternalLink size={14} className="mr-1" /> Access Resource
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">No URL attachment</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingItem}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Study Material' : 'Upload Study Material'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Material Title"
            required
            placeholder="e.g. Laws of Motion Chapter Summary"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target Batch</label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
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
              label="Chapter Name / Number"
              placeholder="e.g. Chapter 1: Kinematics"
              value={formData.chapter}
              onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Resource Format</label>
              <select
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="PDF">PDF Document</option>
                <option value="Video Link">Video Lecture Link</option>
                <option value="Document">Word Document</option>
                <option value="Image">Image</option>
                <option value="Link">External Web Link</option>
              </select>
            </div>
          </div>

          <Input
            label="External Video / Resource Link (URL)"
            placeholder="https://youtube.com/watch?v=..."
            value={formData.external_url || formData.file_url}
            onChange={(e) => setFormData({ ...formData, external_url: e.target.value, file_url: e.target.value })}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Or Upload File (PDF/Image)</label>
            <input
              ref={fileInputRef}
              type="file"
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white file:font-semibold hover:file:bg-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_published" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Publish material immediately for student access
            </label>
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
              {editingItem ? 'Update Material' : 'Publish Resource'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal title="Confirm Deletion" isOpen={!!deletingId} onClose={() => setDeletingId(null)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-500">
            <AlertCircle size={24} />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Are you sure you want to delete this study material resource?
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button onClick={() => handleDelete(deletingId)} className="bg-rose-600 hover:bg-rose-500 text-white">
              Delete Material
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

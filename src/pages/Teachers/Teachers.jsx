import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, UserCheck, Phone, Mail, Award, Calendar, Eye, ShieldCheck, Copy, CheckCircle2, KeyRound, Layers } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useTeachers } from '../../hooks/useTeachers';
import { createTeacher, updateTeacher, deleteTeacher, provisionTeacherAccount } from '../../services/teacherService';
import { useInstitute } from '../../contexts/InstituteContext';
import { useToast } from '../../components/common/Toast';

export default function Teachers() {
  const { instituteId } = useInstitute();
  const { teachers, isLoading, error, refetch } = useTeachers();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [provisioningId, setProvisioningId] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    qualification: 'M.Sc Physics',
    specialization: 'Physics & Science',
    joining_date: new Date().toISOString().slice(0, 10),
    salary: 45000,
    status: 'Active',
  });


  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.full_name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.includes(q) ||
        t.specialization?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

  const openAddModal = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      qualification: 'M.Sc Physics',
      specialization: 'Physics & Science',
      joining_date: new Date().toISOString().slice(0, 10),
      salary: 45000,
      status: 'Active',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTeacher(t);
    setFormData({
      full_name: t.full_name || '',
      email: t.email || '',
      phone: t.phone || '',
      qualification: t.qualification || '',
      specialization: t.specialization || t.subject || '',
      joining_date: t.joining_date || new Date().toISOString().slice(0, 10),
      salary: t.salary || 0,
      status: t.status || 'Active',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createTeacher(formData, instituteId);
      await refetch();
      toast(`Teacher "${formData.full_name}" registered successfully.`);
      setIsAddModalOpen(false);

      if (created?._credentials?.tempPassword) {
        setCreatedCredentials({
          identifier: created._credentials.identifier,
          password: created._credentials.tempPassword,
          fullName: formData.full_name,
        });
      }
    } catch (err) {
      toast(err.message || 'Failed to register teacher.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvisionExisting = async (t) => {
    setProvisioningId(t.id);
    try {
      const res = await provisionTeacherAccount(t.id, t.full_name, t.phone, t.email);
      await refetch();
      toast(`Account provisioned successfully for ${t.full_name}.`);
      setCreatedCredentials({
        identifier: res.identifier,
        password: res.tempPassword,
        fullName: t.full_name,
      });
    } catch (err) {
      toast(err.message || 'Failed to provision account.', 'error');
    } finally {
      setProvisioningId(null);
    }
  };


  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTeacher || !formData.full_name.trim()) return;
    setIsSubmitting(true);
    try {
      await updateTeacher(editingTeacher.id, formData, instituteId);
      await refetch();
      toast(`Teacher profile updated successfully.`);
      setEditingTeacher(null);
    } catch (err) {
      toast(err.message || 'Failed to update teacher.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate faculty record for "${name}"?`)) return;
    try {
      await deleteTeacher(id, instituteId);
      await refetch();
      toast(`Faculty record updated to Inactive.`);
    } catch (err) {
      toast(err.message || 'Failed to deactivate teacher.', 'error');
    }
  };

  if (isLoading) return <Loader label="Loading faculty staff directory..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Teachers & Faculty Staff
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage coaching faculty instructors, academic qualifications, and teaching schedules.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} className="mr-2" /> Add New Teacher
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
            placeholder="Search by teacher name, email, phone, or subject..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredTeachers.length}</span> of {teachers.length} teachers
          </div>
        </div>
      </div>

      {/* Teacher Cards Grid */}
      {filteredTeachers.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title={search ? 'No matching teachers found' : 'No Faculty Staff Catalogued'}
          description={
            search
              ? 'Try refining your search terms.'
              : 'Register your first faculty member to start assigning teaching batches and schedules.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((t) => (
            <Card key={t.id} className="flex flex-col justify-between p-6 hover:shadow-lg transition">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-md">
                      {t.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.full_name}</h3>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {t.specialization || t.subject || 'General Faculty'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      t.status === 'Inactive'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {t.status || 'Active'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {t.teacher_id_code && (
                    <div className="flex items-center gap-2 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      <UserCheck size={14} className="shrink-0" />
                      <span>{t.teacher_id_code}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-slate-400 shrink-0" />
                    <span>{t.qualification || 'Higher Education Degree'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{t.email || 'Email not recorded'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>{t.phone || 'Phone not recorded'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {t.salary ? `₹${Number(t.salary).toLocaleString('en-IN')}/mo` : ''}
                </div>
                <div className="flex items-center gap-2">
                  {!t.user_id && (
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-2 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                      disabled={provisioningId === t.id}
                      onClick={() => handleProvisionExisting(t)}
                    >
                      <KeyRound size={12} className="mr-1" />
                      {provisioningId === t.id ? 'Creating...' : 'Provision Login'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-2 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 dark:text-indigo-400"
                    onClick={() => navigate(`/teachers/${t.id}`)}
                  >
                    <Layers size={13} className="mr-1" /> Assign
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/teachers/${t.id}`)}>
                    <Eye size={14} className="mr-1" /> Profile
                  </Button>
                  <Button variant="secondary" onClick={() => openEditModal(t)}>
                    <Edit2 size={14} />
                  </Button>
                </div>

              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Teacher Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Faculty Teacher">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Dr. Rajesh Kumar"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. rajesh@edupilot.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Contact"
              placeholder="e.g. +91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Qualification / Degree"
              placeholder="e.g. Ph.D / M.Sc Physics"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
            />
            <Input
              label="Subject Specialization"
              placeholder="e.g. Physics & Mathematics"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Base Salary (₹)"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
            <Input
              label="Joining Date"
              type="date"
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Register Faculty'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal isOpen={Boolean(editingTeacher)} onClose={() => setEditingTeacher(null)} title="Edit Faculty Member Information">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Contact"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Qualification / Degree"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
            />
            <Input
              label="Subject Specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Base Salary (₹)"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
            <Input
              label="Joining Date"
              type="date"
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditingTeacher(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Faculty Profile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* One-Time Teacher Credentials Modal */}
      <Modal
        isOpen={Boolean(createdCredentials)}
        onClose={() => setCreatedCredentials(null)}
        title="Faculty Account Provisioned"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={20} className="shrink-0" />
            <p className="text-xs">
              Account created successfully for <strong>{createdCredentials?.fullName}</strong>.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Teacher ID
              </label>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono text-white">
                <span>{createdCredentials?.identifier}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.identifier || '');
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {copiedId ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Temporary Password
              </label>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono text-amber-400 font-bold">
                <span>{createdCredentials?.password}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.password || '');
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {copiedPassword ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            Save these credentials securely. The temporary password will not be shown again.
          </p>

          <Button
            type="button"
            className="w-full py-2.5"
            onClick={() => setCreatedCredentials(null)}
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}


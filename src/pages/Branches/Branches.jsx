import { useState, useMemo } from 'react';
import { useBranches } from '../../hooks/useBranches';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { Building2, Plus, Search, MapPin, Phone, Mail, Edit2 } from 'lucide-react';

export default function Branches() {
  const { branches, loading, addBranch, editBranch } = useBranches();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
  });

  const filteredBranches = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return branches;
    return branches.filter(
      (b) =>
        b.name?.toLowerCase().includes(query) ||
        b.code?.toLowerCase().includes(query) ||
        b.address?.toLowerCase().includes(query) ||
        b.email?.toLowerCase().includes(query)
    );
  }, [branches, search]);

  const openAddModal = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await addBranch(formData);
      toast('Branch created successfully.');
      setIsAddModalOpen(false);
    } catch (err) {
      toast(err.message || 'Failed to create branch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBranch || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await editBranch(editingBranch.id, formData);
      toast('Branch updated successfully.');
      setEditingBranch(null);
    } catch (err) {
      toast(err.message || 'Failed to update branch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading institute branches..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Branch Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your coaching institute campus locations and contact information.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} className="mr-2" /> Add New Branch
        </Button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches by name, code, address, or email..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredBranches.length}</span> of {branches.length} branches
        </div>
      </div>

      {/* Branch Cards */}
      {filteredBranches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? "No matching branches found" : "No Branches Catalogued"}
          description={
            search
              ? "Try adjusting your search criteria."
              : "Add your first campus branch to start organizing batches and rooms."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBranches.map((branch) => (
            <Card key={branch.id} className="flex flex-col justify-between p-6 hover:shadow-lg transition">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{branch.name}</h3>
                      {branch.code && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Code: {branch.code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{branch.address || 'Address not recorded.'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="shrink-0 text-slate-400" />
                    <span>{branch.phone || 'Phone not recorded.'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="shrink-0 text-slate-400" />
                    <span>{branch.email || 'Email not recorded.'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button variant="secondary" onClick={() => openEditModal(branch)}>
                  <Edit2 size={14} className="mr-1.5" /> Edit Branch
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Campus Branch">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Branch Name"
            required
            placeholder="e.g. North Campus / Main Center"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Branch Code"
            placeholder="e.g. NC-01"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Phone Contact"
              placeholder="e.g. +91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Branch Email"
              type="email"
              placeholder="e.g. north@edupilot.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Address / Location</label>
            <textarea
              rows={3}
              placeholder="e.g. Building 42, Knowledge Park, City"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Branch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal isOpen={Boolean(editingBranch)} onClose={() => setEditingBranch(null)} title="Edit Branch Information">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Branch Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Branch Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Phone Contact"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Branch Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Address / Location</label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditingBranch(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

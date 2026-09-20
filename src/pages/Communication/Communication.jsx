import { useState } from 'react';
import { useAnnouncements } from '../../hooks/useMyAnnouncements';
import { useNotifications } from '../../hooks/useNotifications';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { Speaker, Bell, Plus, Send, CheckCircle2 } from 'lucide-react';

export default function Communication() {
  const { announcements, addAnnouncement } = useAnnouncements();
  const { notifications, sendNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_role: 'all',
    priority: 'Normal'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addAnnouncement(formData.title, formData.message);
    await sendNotification({
      title: formData.title,
      message: formData.message,
      type: 'announcement'
    });
    setIsModalOpen(false);
    setFormData({
      title: '',
      message: '',
      target_role: 'all',
      priority: 'Normal'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Institute Communication Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Broadcast institute announcements and manage target notifications across batches.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" /> New Announcement
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Announcements */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Speaker size={18} className="text-indigo-600" /> Institute Announcements
          </h2>
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">{ann.title}</h3>
                  <span className="text-xs text-slate-400">{new Date(ann.created_at || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{ann.message}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Notifications Dispatch Stream */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Bell size={18} className="text-indigo-600" /> Dispatch Log & In-App Alerts
          </h2>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-start justify-between rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{notif.title}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">{notif.message}</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium">
                  Sent
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Broadcast Announcement Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Broadcast Announcement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required placeholder="Parent Teacher Meeting Notice" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target Audience</label>
            <select
              value={formData.target_role}
              onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">All Institute Members</option>
              <option value="student">Students Only</option>
              <option value="teacher">Teachers Only</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Announcement Message</label>
            <textarea
              rows={4}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Enter announcement details..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">
              <Send size={16} className="mr-2" /> Broadcast Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { Bell, Check } from 'lucide-react';
import { useStudentNotifications } from '../../hooks/useNotifications';

export default function StudentNotifications() {
  const { notifications, loading, markRead } = useStudentNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Notifications addressed to your student account.</p>
      </div>
      {loading ? <div className="text-slate-400">Loading notifications...</div> : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No notifications yet.</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-white">{notification.title}</div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                <div className="mt-2 text-xs text-slate-500">{notification.created_at ? new Date(notification.created_at).toLocaleDateString('en-IN') : 'Recently'}</div>
              </div>
              {!notification.is_read && (
                <button type="button" onClick={() => markRead(notification.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" title="Mark as read" aria-label="Mark as read">
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const icons = { success: CheckCircle2, error: CircleAlert, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const toast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  return <ToastContext.Provider value={{ toast }}>{children}<div aria-live="polite" className="fixed right-4 top-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"><AnimatePresence>{toasts.map(({ id, message, type }) => { const Icon = icons[type] ?? Info; return <motion.div key={id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className={`flex items-center gap-3 rounded-xl border p-4 shadow-xl ${type === 'error' ? 'border-rose-500/40 bg-rose-950 text-rose-100' : 'border-emerald-500/40 bg-emerald-950 text-emerald-100'}`}><Icon size={18}/><p className="flex-1 text-sm font-medium">{message}</p><button aria-label="Dismiss notification" onClick={() => dismiss(id)}><X size={16}/></button></motion.div>; })}</AnimatePresence></div></ToastContext.Provider>;
}

export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('useToast must be used within ToastProvider'); return value; }

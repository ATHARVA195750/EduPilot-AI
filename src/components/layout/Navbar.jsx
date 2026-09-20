import { useMemo } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

function Navbar() {
  const { user, signOut } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const userName = useMemo(() => user?.email?.split('@')[0] ?? 'Admin', [user]);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">EduPilot AI</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your institute, students, and AI tools.</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
        </button>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">{userName}</div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Navbar;

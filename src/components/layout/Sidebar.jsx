import { NavLink } from 'react-router-dom';
import { useInstitute } from '../../contexts/InstituteContext';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  Layers,
  Calendar,
  CheckCircle2,
  DollarSign,
  CreditCard,
  TrendingUp,
  Receipt,
  FileText,
  Award,
  BookMarked,
  FolderKanban,
  MessageSquare,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Bot,
  UserCircle,
  Settings as SettingsIcon,
} from 'lucide-react';

const ownerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/branches', label: 'Campus Branches', icon: Building2 },
  { to: '/admissions', label: 'Admissions & Leads', icon: UserPlus },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/teachers', label: 'Teachers & Staff', icon: Users },
  { to: '/courses', label: 'Courses & Subjects', icon: BookOpen },
  { to: '/batches', label: 'Batches', icon: Layers },
  { to: '/timetable', label: 'Timetable', icon: Calendar },
  { to: '/attendance', label: 'Attendance', icon: CheckCircle2 },
  { to: '/fees', label: 'Fee Structures', icon: DollarSign },
  { to: '/payments', label: 'Payments & Receipts', icon: CreditCard },
  { to: '/finance', label: 'Finance & P&L', icon: TrendingUp },
  { to: '/payroll', label: 'Payroll', icon: Receipt },
  { to: '/tests', label: 'Exams & Tests', icon: FileText },
  { to: '/results', label: 'Results', icon: Award },
  { to: '/homework', label: 'Homework', icon: BookMarked },
  { to: '/study-material', label: 'Study Material', icon: FolderKanban },
  { to: '/communication', label: 'Communication', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports Hub', icon: FileSpreadsheet },
  { to: '/ai', label: 'AI Copilot', icon: Bot },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const teacherLinks = [
  { to: '/teacher', label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/batches', label: 'Assigned Batches', icon: Layers },
  { to: '/timetable', label: 'My Timetable', icon: Calendar },
  { to: '/attendance', label: 'Mark Attendance', icon: CheckCircle2 },
  { to: '/homework', label: 'Homework', icon: BookMarked },
  { to: '/study-material', label: 'Study Material', icon: FolderKanban },
  { to: '/tests', label: 'Tests & Exams', icon: FileText },
  { to: '/results', label: 'Student Results', icon: Award },
  { to: '/communication', label: 'Announcements', icon: MessageSquare },
  { to: '/ai', label: 'AI Assistant', icon: Bot },
];

const studentLinks = [
  { to: '/student', label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/timetable', label: 'My Timetable', icon: Calendar },
  { to: '/attendance', label: 'My Attendance', icon: CheckCircle2 },
  { to: '/homework', label: 'Homework', icon: BookMarked },
  { to: '/study-material', label: 'Study Material', icon: FolderKanban },
  { to: '/tests', label: 'Tests', icon: FileText },
  { to: '/results', label: 'My Results', icon: Award },
  { to: '/fees', label: 'Fees & Payments', icon: DollarSign },
  { to: '/communication', label: 'Announcements', icon: MessageSquare },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/ai', label: 'AI Student Tutor', icon: Bot },
  { to: '/profile', label: 'Profile / Settings', icon: UserCircle },
];

function Sidebar() {
  const { role } = useInstitute();

  let activeLinks = ownerLinks;
  if (role === 'teacher') activeLinks = teacherLinks;
  if (role === 'student') activeLinks = studentLinks;

  return (
    <aside className="w-72 border-r border-slate-200 bg-slate-50 text-slate-900 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-md">
            E
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">EduPilot ERP</div>
            <div className="text-xs font-semibold text-indigo-600 capitalize dark:text-indigo-400">{role ? `${role} Portal` : 'Loading...'}</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {activeLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard' || link.to === '/student' || link.to === '/teacher'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 dark:border-slate-800">
        EduPilot ERP v2.0 • SaaS Enterprise
      </div>
    </aside>
  );
}

export default Sidebar;

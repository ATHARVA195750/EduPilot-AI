import { BookOpen, Brain, ClipboardCheck, Lightbulb } from 'lucide-react';
import StudentChat from '../StudentDashboard/StudentChat';

const studyPrompts = [
  { label: 'Explain a concept', icon: Brain },
  { label: 'Help me revise', icon: BookOpen },
  { label: 'Prepare for a test', icon: ClipboardCheck },
  { label: 'Give me a study tip', icon: Lightbulb },
];

export default function StudentAITutor() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Student Tutor</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Get help with concepts, revision, homework, and exam preparation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {studyPrompts.map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <Icon className="h-5 w-5 text-indigo-500" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
          </div>
        ))}
      </div>
      <StudentChat />
    </div>
  );
}

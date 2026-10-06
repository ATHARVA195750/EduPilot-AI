import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useInstitute } from '../../contexts/InstituteContext';
import { generateAIResponse } from '../../lib/openai';
import AIChat from './AIChat';

// Suggested prompts send real prompts through the existing ai-insights endpoint,
// which derives role and institute scope server-side from the JWT. Financial
// wording is owner/admin-only (enforced server-side), so the teacher and
// student sets deliberately avoid financial terms.
const OWNER_SUGGESTIONS = [
  { icon: '💰', label: 'Fee summary', prompt: 'Give me a fee summary: total collected, total pending amount, overdue count, and recent collections.' },
  { icon: '📊', label: 'Performance', prompt: 'Give me an institute performance summary.' },
  { icon: '👥', label: 'Students', prompt: 'How many students do we have and what are their statuses?' },
  { icon: '📅', label: 'Attendance', prompt: 'Summarize attendance trends and highlight any students at risk.' },
];

const TEACHER_SUGGESTIONS = [
  { icon: '👥', label: 'My batches', prompt: 'How many students are in my assigned batches and what are their statuses?' },
  { icon: '📅', label: 'Attendance', prompt: 'Summarize attendance trends for my batches and highlight any students at risk.' },
  { icon: '📝', label: 'Homework', prompt: 'Summarize upcoming homework workload and risks.' },
  { icon: '📊', label: 'Performance', prompt: 'Give me a performance summary for the students in my batches.' },
];

// The four quick prompts from the former AI Student Tutor page, preserved
// verbatim. `prefill: true` fills the input instead of sending immediately
// (the original card used sendImmediately: false for its open-ended prompt).
const STUDENT_SUGGESTIONS = [
  { icon: '🧠', label: 'Explain a concept', prompt: 'Explain the core concept of ', prefill: true },
  { icon: '📖', label: 'Help me revise', prompt: 'Help me revise the key points and concepts for my upcoming syllabus.' },
  { icon: '📋', label: 'Prepare for a test', prompt: 'Help me prepare for an exam. Give me 3 high-yield practice questions and explain how to answer them.' },
  { icon: '💡', label: 'Give me a study tip', prompt: 'Give me an effective, science-backed study tip or revision routine for student learning.' },
];

const ROLE_PROFILES = {
  owner: {
    subtitle: "Your institute's AI assistant",
    welcome: 'Hi 👋 What would you like to know about your institute?',
    suggestions: OWNER_SUGGESTIONS,
  },
  admin: {
    subtitle: "Your institute's AI assistant",
    welcome: 'Hi 👋 What would you like to know about your institute?',
    suggestions: OWNER_SUGGESTIONS,
  },
  teacher: {
    subtitle: 'Your teaching assistant',
    welcome: 'Hi 👋 Ask about your batches, attendance, homework, or student performance.',
    suggestions: TEACHER_SUGGESTIONS,
  },
  student: {
    subtitle: 'Your AI study buddy',
    welcome: 'Hello! I am your AI Study & Doubts Assistant. Ask me any study-related question, topic explanation, or general institute FAQs!',
    suggestions: STUDENT_SUGGESTIONS,
  },
};

// Single floating AI entry point for every authenticated role. Mounted once in
// Layout, so there is exactly one trigger on every page. Reuses the existing
// request path: POST /api/v1/ai/tutor via src/lib/openai.js (FastAPI + Groq);
// role and institute_id are derived server-side from the JWT, never sent here.
export default function GlobalCopilot() {
  const institute = useInstitute();
  const role = institute?.role;
  const [open, setOpen] = useState(false);

  // Render only once the profile role is known; the four VALID_ROLES in
  // InstituteContext each map to a role-specific profile below.
  const profile = ROLE_PROFILES[role];
  if (!profile) return null;

  const send = async (prompt) => {
    const res = await generateAIResponse(prompt);
    const reply = res?.response || res?.reply || res?.choices?.[0]?.message?.content || (typeof res === 'string' ? res : null);
    if (!reply) throw new Error('Empty AI response.');
    return reply;
  };

  return (
    <>
      {!open && (
        <button
          id="edupilot-copilot-trigger"
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Open EduPilot Copilot"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:scale-105 hover:from-blue-500 hover:to-indigo-500 active:scale-95 sm:bottom-6 sm:right-6"
        >
          <Bot className="h-5 w-5 text-amber-300" />
          <span>🤖 EduPilot Copilot</span>
        </button>
      )}

      <AIChat
        open={open}
        onClose={() => setOpen(false)}
        title="EduPilot Copilot"
        subtitle={profile.subtitle}
        welcome={profile.welcome}
        suggestions={profile.suggestions}
        send={send}
      />
    </>
  );
}

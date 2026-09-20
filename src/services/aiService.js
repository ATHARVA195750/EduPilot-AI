import { generateAIResponse } from '../lib/openai';
import { DEMO_FEES, DEMO_STUDENTS, DEMO_ATTENDANCE } from '../utils/demoData';

export async function fetchAIInsights(prompt, userRole = 'admin', extraContext = {}) {
  // Role security scoping:
  const isStudent = userRole === 'student';
  const isTeacher = userRole === 'teacher';
  const lowerPrompt = prompt.toLowerCase();

  // If a student tries asking for financial/administrative data:
  if (isStudent && (lowerPrompt.includes('fee') || lowerPrompt.includes('revenue') || lowerPrompt.includes('income') || lowerPrompt.includes('salary') || lowerPrompt.includes('expense') || lowerPrompt.includes('institute'))) {
    return '🔒 Access Restricted: As a student, you only have access to your personal study assistant, practice tests, homework help, and course materials.';
  }

  if (isTeacher && (lowerPrompt.includes('revenue') || lowerPrompt.includes('net income') || lowerPrompt.includes('salary') || lowerPrompt.includes('payroll'))) {
    return '🔒 Access Restricted: Administrative financial records and payroll are accessible only to Institute Owners and Admins.';
  }

  // Synthesize ERP context
  let contextHeader = `System Role Context: ${userRole.toUpperCase()}\n`;

  if (!isStudent) {
    const totalFeesPending = DEMO_FEES.reduce((acc, f) => acc + (f.due_amount || 0), 0);
    const totalFeesCollected = DEMO_FEES.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
    contextHeader += `[Institute ERP Live Context: ${DEMO_STUDENTS.length} active students, Pending Fees: ₹${totalFeesPending}, Fees Collected: ₹${totalFeesCollected}]\n`;
  }

  const fullPrompt = `${contextHeader}\nUser Query: ${prompt}`;

  try {
    const response = await generateAIResponse(fullPrompt);
    return response?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    return 'EduPilot AI Copilot is temporarily analyzing live institute data offline.';
  }
}

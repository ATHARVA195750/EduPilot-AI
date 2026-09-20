export const DEMO_STUDENTS = [
  { id: 's1', full_name: 'Aarav Sharma', standard: 'Class 10th', batch: 'Batch A', parent_phone: '9876543210', status: 'Active', created_at: new Date().toISOString() },
  { id: 's2', full_name: 'Ananya Patel', standard: 'Class 10th', batch: 'Batch A', parent_phone: '9812345678', status: 'Active', created_at: new Date().toISOString() },
  { id: 's3', full_name: 'Rohan Verma', standard: 'Class 12th', batch: 'Batch B', parent_phone: '9765432109', status: 'Active', created_at: new Date().toISOString() },
  { id: 's4', full_name: 'Priya Singh', standard: 'Class 12th', batch: 'Batch B', parent_phone: '9988776655', status: 'Active', created_at: new Date().toISOString() },
];

export const DEMO_TEACHERS = [
  { id: 't1', name: 'Dr. Rajesh Kumar', subject: 'Physics', phone: '9800011122' },
  { id: 't2', name: 'Sunita Gupta', subject: 'Mathematics', phone: '9800033344' },
];

export const DEMO_FEES = [
  { id: 'f1', student_id: 's1', total_amount: 15000, paid_amount: 15000, due_amount: 0, payment_status: 'paid', created_at: new Date().toISOString() },
  { id: 'f2', student_id: 's2', total_amount: 15000, paid_amount: 5000, due_amount: 10000, payment_status: 'pending', created_at: new Date().toISOString() },
  { id: 'f3', student_id: 's3', total_amount: 20000, paid_amount: 10000, due_amount: 10000, payment_status: 'pending', created_at: new Date().toISOString() },
];

export const DEMO_ATTENDANCE = [
  { id: 'a1', student_id: 's1', status: 'present', attendance_date: new Date().toISOString().slice(0, 10) },
  { id: 'a2', student_id: 's2', status: 'absent', attendance_date: new Date().toISOString().slice(0, 10) },
  { id: 'a3', student_id: 's3', status: 'present', attendance_date: new Date().toISOString().slice(0, 10) },
];

export const DEMO_HOMEWORK = [
  { id: 'h1', title: 'Calculus Chapter 3 Practice Problems', subject: 'Mathematics', standard: 'Class 12th', due_date: new Date(Date.now() + 86400000 * 3).toISOString() },
  { id: 'h2', title: 'Laws of Motion Numerical Sheet', subject: 'Physics', standard: 'Class 10th', due_date: new Date(Date.now() + 86400000 * 2).toISOString() },
];

export const DEMO_TESTS = [
  { id: 'test1', title: 'Mid-Term Physics Assessment', subject: 'Physics', total_marks: 100, test_date: new Date().toISOString() },
];

export const DEMO_ANNOUNCEMENTS = [
  { id: 'ann1', title: 'Parent-Teacher Meeting Scheduled', message: 'Annual PTM will be conducted this Saturday from 10:00 AM onwards.', created_at: new Date().toISOString() },
];

export const DEMO_DASHBOARD = {
  students: DEMO_STUDENTS,
  teachers: DEMO_TEACHERS,
  attendance: DEMO_ATTENDANCE,
  fees: DEMO_FEES,
  homework: DEMO_HOMEWORK,
  tests: DEMO_TESTS,
  announcements: DEMO_ANNOUNCEMENTS,
};
